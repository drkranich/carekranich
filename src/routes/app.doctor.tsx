import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileDown, FileSignature, Plus, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/doctor")({ component: DoctorPortal });

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  completed: "Completed",
  canceled: "Canceled",
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
  const [manualExam, setManualExam] = useState("");
  const [manualExams, setManualExams] = useState<string[]>([]);
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
  const manualExamSummary = (order: any) => {
    const line = String(order.clinical_notes ?? "")
      .split("\n")
      .find((item) => item.startsWith("Manual exam requests:"));
    return line ? line.replace("Manual exam requests:", "").trim() : "";
  };
  const orderExamSummary = (order: any) =>
    [
      ...(order.exam_ids ?? []).map((id: string) => examName(id)),
      manualExamSummary(order),
    ].filter(Boolean).join(", ") || "Manual request";

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("No organization available.");
      if (!draft.patient_id) throw new Error("Select the patient.");
      const typedFallback =
        examIds.length === 0 && manualExams.length === 0 && draft.clinical_notes.trim()
          ? [draft.clinical_notes.trim()]
          : [];
      const requestedExamNames = [
        ...examIds.map(examName),
        ...manualExams,
        ...typedFallback,
      ].filter(Boolean);
      if (requestedExamNames.length === 0) {
        throw new Error("Select a catalog exam or write a manual exam request.");
      }
      const signed_hash = await sha256Hex(
        `${user?.id}|${draft.patient_id}|${requestedExamNames.join(",")}|${Date.now()}`,
      );
      const notes = [
        manualExams.length || typedFallback.length
          ? `Manual exam requests: ${[...manualExams, ...typedFallback].join(", ")}`
          : "",
        typedFallback.length ? "" : draft.clinical_notes.trim(),
      ].filter(Boolean).join("\n\n");
      const { error } = await (supabase as any).from("doctor_orders").insert({
        tenant_id: effTenant,
        doctor_id: user?.id,
        patient_id: draft.patient_id,
        exam_ids: examIds,
        clinical_notes: notes || null,
        urgent: draft.urgent,
        signed_hash,
        signed_at: new Date().toISOString(),
      });
      if (error) throw error;
      if (draft.urgent) {
        await (supabase as any).from("alerts").insert({
          tenant_id: effTenant,
          title: `URGENT medical order — ${patientName(draft.patient_id)}`,
          description: `Exams: ${requestedExamNames.join(", ")}`,
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
      setManualExam("");
      setManualExams([]);
      qc.invalidateQueries({ queryKey: ["doctor-orders", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send the order"),
  });

  const addManualExam = () => {
    const value = manualExam.trim();
    if (!value) return;
    if (manualExams.some((item) => item.toLowerCase() === value.toLowerCase())) {
      toast.info("This manual exam is already listed.");
      return;
    }
    setManualExams((current) => [...current, value]);
    setManualExam("");
  };

  const setStatus = async (order: any, status: string) => {
    const { error } = await (supabase as any).from("doctor_orders").update({ status }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(`Order: ${STATUS_LABEL[status]}`);
    qc.invalidateQueries({ queryKey: ["doctor-orders", user?.id] });
  };

  const exportOrder = (o: any) => {
    downloadPdf(`order-${patientName(o.patient_id)}.pdf`, "Electronic medical order", [
      `Patient: ${patientName(o.patient_id)}`,
      `Date: ${new Date(o.created_at).toLocaleString("en-US")}`,
      `Urgency: ${o.urgent ? "YES" : "no"}`,
      `Status: ${STATUS_LABEL[o.status] ?? o.status}`,
      "",
      "Requested exams:",
      ...(o.exam_ids ?? []).map((id: string) => `- ${examName(id)}`),
      manualExamSummary(o) ? `- ${manualExamSummary(o)}` : "",
      "",
      o.clinical_notes ? `Clinical notes: ${o.clinical_notes}` : "",
      "",
      `Electronic signature (SHA-256): ${o.signed_hash ?? "-"}`,
    ].filter((l) => l !== ""));
  };

  const exportReport = (r: any) => {
    downloadPdf(`report-${r.title}.pdf`, r.title, [
      `Patient: ${patientName(r.patient_id)}`,
      `Version: ${r.version} - Status: ${r.status}`,
      "",
      ...(r.result_text ?? "").split("\n"),
      r.reference_values ? `Reference: ${r.reference_values}` : "",
      r.comments ? `Comments: ${r.comments}` : "",
      r.signed_hash ? `Verification: ${r.signed_hash}` : "",
    ].filter((l: string) => l !== ""));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor portal"
        subtitle="Signed electronic orders, patient follow-up and critical result alerts."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="My orders" value={(orders.data ?? []).length} sub="Electronic orders" tone="olive" />
        <Stat label="Linked patients" value={myPatientIds.length} sub="Via orders" tone="moss" />
        <Stat label="Available reports" value={(reports.data ?? []).length} sub="For your patients" tone="gold" />
        <Stat label="Open criticals" value={(criticals.data ?? []).length} sub="Require attention" tone="wine" />
      </div>

      {(criticals.data ?? []).length > 0 && (
        <Card className="border-wine/25 bg-wine/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-wine">
            <AlertTriangle className="h-4 w-4" /> Open critical results
          </p>
          <div className="mt-2 space-y-1">
            {(criticals.data ?? []).map((c: any) => (
              <p key={c.id} className="text-xs text-muted-foreground">
                {patientName(c.patient_id)} - protocol {c.status === "contacting" ? "contacting" : "open"} since{" "}
                {new Date(c.created_at).toLocaleString("en-US")}
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
            {draft.urgent ? "URGENT - alert will be triggered" : "Mark as urgent"}
          </button>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Requested exams ({examIds.length + manualExams.length})
          </p>
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
            {(exams.data ?? []).length === 0 && (
              <p className="w-full rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-xs leading-5 text-muted-foreground">
                No active catalog exams are available. Write a manual request below to sign the order.
              </p>
            )}
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={manualExam}
              onChange={(event) => setManualExam(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addManualExam();
                }
              }}
              placeholder="Manual exam request, e.g. kidney ultrasound"
              className="min-w-64 flex-1 rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
            />
            <button
              type="button"
              onClick={addManualExam}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-medium text-olive shadow-soft backdrop-blur-xl hover:bg-white/80"
            >
              <Plus className="h-3.5 w-3.5" /> Add manual exam
            </button>
          </div>
          {manualExams.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {manualExams.map((exam) => (
                <span
                  key={exam}
                  className="inline-flex items-center gap-2 rounded-full border border-baby/45 bg-baby/20 px-3 py-1.5 text-xs text-foreground"
                >
                  {exam}
                  <button
                    type="button"
                    onClick={() => setManualExams((items) => items.filter((item) => item !== exam))}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-wine" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <textarea
          value={draft.clinical_notes}
          onChange={(e) => setDraft({ ...draft, clinical_notes: e.target.value })}
          rows={3}
          placeholder="Clinical notes for the laboratory (diagnostic hypothesis, current medications...)"
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
                  {o.urgent && <Pill tone="wine">Urgent</Pill>}
                  <Pill tone={o.status === "completed" ? "moss" : o.status === "canceled" ? "muted" : "gold"}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Pill>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {orderExamSummary(o)} - {new Date(o.created_at).toLocaleDateString("en-US")}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => exportOrder(o)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5">
                  <FileDown className="h-3 w-3" /> PDF
                </button>
                {o.status === "requested" && (
                  <button onClick={() => setStatus(o, "scheduled")} className="rounded-full border border-border bg-white/55 px-3 py-1.5">
                    Mark scheduled
                  </button>
                )}
                {["requested", "scheduled"].includes(o.status) && (
                  <>
                    <button onClick={() => setStatus(o, "completed")} className="rounded-full bg-moss px-3 py-1.5 font-medium text-ivory">
                      Complete
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
                  {patientName(r.patient_id)} - v{r.version} - {new Date(r.created_at).toLocaleDateString("en-US")}
                </p>
              </div>
              <span className="flex items-center gap-2">
                {r.is_critical && <Pill tone="wine">Critical</Pill>}
                <Pill tone={r.status === "released" ? "moss" : "gold"}>
                  {r.status === "released" ? "released" : "processing"}
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
