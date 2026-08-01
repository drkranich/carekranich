import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileDown, FileSignature, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/doctor")({ component: DoctorPortal });

const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitado",
  scheduled: "Agendado",
  completed: "Concluído",
  canceled: "Cancelado",
};

async function sha256Hex(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function DoctorPortal() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, hasAnyRole } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const canUse = hasAnyRole(["doctor", "clinic_admin", "super_admin"]);
  const [draft, setDraft] = useState({ patient_id: "", clinical_notes: "", urgent: false });
  const [examIds, setExamIds] = useState<string[]>([]);
  if (!canUse) return <Navigate to="/app" />;

  const tenantsList = useQuery({
    queryKey: ["doctor-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["doctor-patients", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("id,full_name,social_name")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const exams = useQuery({
    queryKey: ["doctor-exams", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name,category")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["doctor-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("doctor_orders")
        .select("*")
        .eq("doctor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const myPatientIds = useMemo(
    () => Array.from(new Set((orders.data ?? []).map((o: any) => o.patient_id).filter(Boolean))),
    [orders.data],
  );

  const reports = useQuery({
    queryKey: ["doctor-reports", myPatientIds.join(",")],
    enabled: myPatientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lab_reports")
        .select("id,patient_id,title,status,is_critical,version,created_at,released_at,result_text,reference_values,comments,signed_hash")
        .in("patient_id", myPatientIds)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const criticals = useQuery({
    queryKey: ["doctor-criticals", myPatientIds.join(",")],
    enabled: myPatientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("critical_results")
        .select("*")
        .in("patient_id", myPatientIds)
        .neq("status", "closed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x: any) => x.id === id);
    return p ? p.social_name || p.full_name : "Patient";
  };
  const examName = (id: string) => {
    const exam = (exams.data ?? []).find((x: any) => x.id === id);
    return exam ? exam.commercial_name || exam.name : "Exam";
  };

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("No organization available.");
      if (!draft.patient_id) throw new Error("Select the patient.");
      if (examIds.length === 0) throw new Error("Select at least one exam.");
      const signed_hash = await sha256Hex(
        `${user?.id}|${draft.patient_id}|${examIds.join(",")}|${Date.now()}`,
      );
      const { error } = await (supabase as any).from("doctor_orders").insert({
        tenant_id: effTenant,
        doctor_id: user?.id,
        patient_id: draft.patient_id,
        exam_ids: examIds,
        clinical_notes: draft.clinical_notes.trim() || null,
        urgent: draft.urgent,
        signed_hash,
        signed_at: new Date().toISOString(),
      });
      if (error) throw error;
      if (draft.urgent) {
        await (supabase as any).from("alerts").insert({
          tenant_id: effTenant,
          title: `URGENT medical order — ${patientName(draft.patient_id)}`,
          description: `Exams: ${examIds.map(examName).join(", ")}`,
          severity: "high",
          category: "lab",
          status: "open",
          created_by: user?.id ?? null,
        });
      }
    },
    onSuccess: () => {
      toast.success("Electronic order signed and sent");
      setDraft({ patient_id: "", clinical_notes: "", urgent: false });
      setExamIds([]);
      qc.invalidateQueries({ queryKey: ["doctor-orders", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send the order"),
  });

  const setStatus = async (order: any, status: string) => {
    const { error } = await (supabase as any).from("doctor_orders").update({ status }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(`Pedido: ${STATUS_LABEL[status]}`);
    qc.invalidateQueries({ queryKey: ["doctor-orders", user?.id] });
  };

  const exportOrder = (o: any) => {
    downloadPdf(`order-${patientName(o.patient_id)}.pdf`, "Electronic medical order", [
      `Patient: ${patientName(o.patient_id)}`,
      `Date: ${new Date(o.created_at).toLocaleString("pt-BR")}`,
      `Urgência: ${o.urgent ? "YES" : "não"}`,
      `Status: ${STATUS_LABEL[o.status] ?? o.status}`,
      "",
      "Exams solicitados:",
      ...(o.exam_ids ?? []).map((id: string) => `- ${examName(id)}`),
      "",
      o.clinical_notes ? `Observações clínicas: ${o.clinical_notes}` : "",
      "",
      `Assinatura eletrônica (SHA-256): ${o.signed_hash ?? "-"}`,
    ].filter((l) => l !== ""));
  };

  const exportReport = (r: any) => {
    downloadPdf(`report-${r.title}.pdf`, r.title, [
      `Patient: ${patientName(r.patient_id)}`,
      `Versão: ${r.version} · Status: ${r.status}`,
      "",
      ...(r.result_text ?? "").split("\n"),
      r.reference_values ? `Referência: ${r.reference_values}` : "",
      r.comments ? `Comentários: ${r.comments}` : "",
      r.signed_hash ? `Verificação: ${r.signed_hash}` : "",
    ].filter((l: string) => l !== ""));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal do médico"
        subtitle="Signed electronic orders, patient follow-up and critical result alerts."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="My orders" value={(orders.data ?? []).length} sub="Electronic orders" tone="olive" />
        <Stat label="Linked patients" value={myPatientIds.length} sub="Via orders" tone="moss" />
        <Stat label="Laudos disponíveis" value={(reports.data ?? []).length} sub="For your patients" tone="gold" />
        <Stat label="Críticos abertos" value={(criticals.data ?? []).length} sub="Exigem atenção" tone="wine" />
      </div>

      {(criticals.data ?? []).length > 0 && (
        <Card className="border-wine/25 bg-wine/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-wine">
            <AlertTriangle className="h-4 w-4" /> Resultados críticos em aberto
          </p>
          <div className="mt-2 space-y-1">
            {(criticals.data ?? []).map((c: any) => (
              <p key={c.id} className="text-xs text-muted-foreground">
                {patientName(c.patient_id)} · protocolo {c.status === "contacting" ? "em contato" : "aberto"} desde{" "}
                {new Date(c.created_at).toLocaleString("pt-BR")}
              </p>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-4 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Stethoscope className="h-4 w-4" /> New electronic order
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <GlassSelect
            value={draft.patient_id}
            onChange={(v) => setDraft({ ...draft, patient_id: v })}
            placeholder="Patient *"
            options={(patients.data ?? []).map((p: any) => ({ value: p.id, label: p.social_name || p.full_name }))}
          />
          <button
            type="button"
            onClick={() => setDraft({ ...draft, urgent: !draft.urgent })}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              draft.urgent
                ? "border-wine bg-wine text-ivory shadow-soft"
                : "border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
            }`}
          >
            {draft.urgent ? "URGENTE — alerta será disparado" : "Mark as urgent"}
          </button>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Exams solicitados ({examIds.length})</p>
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
            {(exams.data ?? []).map((e: any) => (
              <button
                key={e.id}
                type="button"
                onClick={() =>
                  setExamIds((prev) => (prev.includes(e.id) ? prev.filter((id) => id !== e.id) : [...prev, e.id]))
                }
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  examIds.includes(e.id)
                    ? "border-olive bg-olive text-ivory shadow-soft"
                    : "border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
                }`}
              >
                {e.commercial_name || e.name}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={draft.clinical_notes}
          onChange={(e) => setDraft({ ...draft, clinical_notes: e.target.value })}
          rows={3}
          placeholder="Observações clínicas para o laboratório (hipótese diagnóstica, medicamentos em uso...)"
          className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
        />
        <button
          onClick={() => createOrder.mutate()}
          disabled={createOrder.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
        >
          <FileSignature className="h-4 w-4" />
          {createOrder.isPending ? "Signing..." : "Sign and send order"}
        </button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">My orders</h3>
          {(orders.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No electronic orders yet.</p>
          )}
          {(orders.data ?? []).map((o: any) => (
            <div key={o.id} className="space-y-2 rounded-2xl border border-white/70 bg-white/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{patientName(o.patient_id)}</p>
                <span className="flex items-center gap-2">
                  {o.urgent && <Pill tone="wine">Urgente</Pill>}
                  <Pill tone={o.status === "completed" ? "moss" : o.status === "canceled" ? "muted" : "gold"}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Pill>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {(o.exam_ids ?? []).map(examName).join(", ")} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => exportOrder(o)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5">
                  <FileDown className="h-3 w-3" /> PDF
                </button>
                {o.status === "requested" && (
                  <button onClick={() => setStatus(o, "scheduled")} className="rounded-full border border-border bg-white/55 px-3 py-1.5">
                    Marcar agendado
                  </button>
                )}
                {["requested", "scheduled"].includes(o.status) && (
                  <>
                    <button onClick={() => setStatus(o, "completed")} className="rounded-full bg-moss px-3 py-1.5 font-medium text-ivory">
                      Concluir
                    </button>
                    <button onClick={() => setStatus(o, "canceled")} className="rounded-full border border-wine/30 bg-wine/5 px-3 py-1.5 text-wine">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </Card>

        <Card className="space-y-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">My patient reports</h3>
          {(reports.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Reports appear here as soon as your patients have results.
            </p>
          )}
          {(reports.data ?? []).map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {patientName(r.patient_id)} · v{r.version} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span className="flex items-center gap-2">
                {r.is_critical && <Pill tone="wine">Crítico</Pill>}
                <Pill tone={r.status === "released" ? "moss" : "gold"}>
                  {r.status === "released" ? "liberado" : "em processamento"}
                </Pill>
                <button onClick={() => exportReport(r)} className="rounded-full border border-border bg-white/55 p-1.5 text-xs">
                  <FileDown className="h-3 w-3" />
                </button>
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
