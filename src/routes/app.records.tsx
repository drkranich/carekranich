import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/records")({ component: MedicalRecords });

const TYPE_LABELS: Record<string, string> = {
  soap: "Evolução SOAP",
  evolucao: "Evolução livre",
  prescricao: "Prescrição",
  atestado: "Atestado",
  alergia: "Alergia",
  historico: "Histórico",
};

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function MedicalRecords() {
  const { profile, user, hasAnyRole, isSuperAdmin, primaryRole } = useAuth();
  const qc = useQueryClient();
  const canAccess = hasAnyRole(["nurse", "doctor", "clinic_admin", "super_admin"]);
  const [residentId, setResidentId] = useState("");
  const [type, setType] = useState("soap");
  const [form, setForm] = useState({ subjective: "", objective: "", assessment: "", plan: "", cid: "", content: "" });
  if (!canAccess) return <Navigate to="/app" />;

  const residents = useQuery({
    queryKey: ["records-residents", profile?.tenant_id],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("residents").select("id, tenant_id, full_name, preferred_name, date_of_birth").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const records = useQuery({
    queryKey: ["medical-records", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("medical_records")
        .select("*")
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const resident = (residents.data ?? []).find((item: any) => item.id === residentId) ?? null;
  const residentLabel = resident ? resident.preferred_name || resident.full_name : "";

  const isSoap = type === "soap";
  const canSave = isSoap
    ? [form.subjective, form.objective, form.assessment, form.plan].some((value) => value.trim())
    : form.content.trim().length > 0;

  const save = useMutation({
    mutationFn: async () => {
      if (!resident) throw new Error("Selecione um residente.");
      const payloadText = isSoap
        ? `S:${form.subjective}\nO:${form.objective}\nA:${form.assessment}\nP:${form.plan}\nCID:${form.cid}`
        : form.content;
      const hash = await sha256Hex(`${resident.id}|${type}|${payloadText}|${user?.id}|${Date.now()}`);
      const { error } = await (supabase as any).from("medical_records").insert({
        tenant_id: resident.tenant_id,
        resident_id: resident.id,
        record_type: type,
        subjective: isSoap ? form.subjective.trim() || null : null,
        objective: isSoap ? form.objective.trim() || null : null,
        assessment: isSoap ? form.assessment.trim() || null : null,
        plan: isSoap ? form.plan.trim() || null : null,
        cid_code: form.cid.trim() || null,
        content: !isSoap ? form.content.trim() : null,
        author_id: user?.id,
        author_role: primaryRole,
        signed_hash: hash,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro assinado e adicionado ao prontuário");
      setForm({ subjective: "", objective: "", assessment: "", plan: "", cid: "", content: "" });
      qc.invalidateQueries({ queryKey: ["medical-records", residentId] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível registrar"),
  });

  const exportRecordPdf = (record: any) => {
    const lines =
      record.record_type === "soap"
        ? [
            `S (Subjetivo): ${record.subjective ?? "-"}`,
            `O (Objetivo): ${record.objective ?? "-"}`,
            `A (Avaliação): ${record.assessment ?? "-"}`,
            `P (Plano): ${record.plan ?? "-"}`,
            `CID: ${record.cid_code ?? "-"}`,
          ]
        : [record.content ?? "-", record.cid_code ? `CID: ${record.cid_code}` : ""];
    downloadPdf(`prontuario-${residentLabel}-${record.record_type}`, `${TYPE_LABELS[record.record_type]} — ${residentLabel}`, [
      ...lines,
      "",
      `Autor: ${record.author_role ? ROLE_LABELS[record.author_role as AppRole] ?? record.author_role : "-"}`,
      `Data: ${new Date(record.created_at).toLocaleString("pt-BR")}`,
      `Hash de integridade: ${record.signed_hash ?? "-"}`,
    ]);
  };

  const exportFullPdf = () => {
    if (!resident) return;
    const lines = (records.data ?? []).flatMap((record: any) => [
      `${new Date(record.created_at).toLocaleString("pt-BR")} — ${TYPE_LABELS[record.record_type]} (${record.author_role ? ROLE_LABELS[record.author_role as AppRole] ?? record.author_role : "-"})`,
      ...(record.record_type === "soap"
        ? [`  S: ${record.subjective ?? "-"}`, `  O: ${record.objective ?? "-"}`, `  A: ${record.assessment ?? "-"}`, `  P: ${record.plan ?? "-"}`, record.cid_code ? `  CID: ${record.cid_code}` : ""]
        : [`  ${record.content ?? "-"}`]),
      "",
    ]);
    downloadPdf(`prontuario-completo-${residentLabel}`, `Prontuário — ${residentLabel}`, [
      resident.date_of_birth ? `Nascimento: ${new Date(resident.date_of_birth + "T12:00:00").toLocaleDateString("pt-BR")}` : "",
      "",
      ...lines,
      `Gerado em ${new Date().toLocaleString("pt-BR")} - Care Kranich`,
    ]);
  };

  return (
    <>
      <PageHeader
        title="Prontuário eletrônico"
        subtitle="Evolução SOAP, prescrições, atestados e alergias — registros imutáveis, assinados com hash e por profissional."
        action={
          <div className="flex items-center gap-2">
            <Pill tone="olive">Imutável + hash</Pill>
            {resident && (
              <button onClick={exportFullPdf} className="rounded-full border border-moss/40 bg-white/60 px-4 py-2 text-xs font-medium hover:bg-moss/15">
                Prontuário completo PDF
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Registros" value={residentId ? records.data?.length ?? "-" : "—"} sub={residentLabel || "Selecione um residente"} tone="olive" />
        <Stat
          label="Última evolução"
          value={records.data?.[0] ? new Date(records.data[0].created_at).toLocaleDateString("pt-BR") : "—"}
          sub={records.data?.[0] ? TYPE_LABELS[records.data[0].record_type] : "Sem registros"}
          tone="moss"
        />
        <Stat
          label="Alergias registradas"
          value={residentId ? (records.data ?? []).filter((r: any) => r.record_type === "alergia").length : "—"}
          sub="Atenção clínica"
          tone="wine"
        />
      </div>

      <Card className="mt-6">
        <GlassSelect
          value={residentId}
          onChange={setResidentId}
          placeholder="Selecione o residente/paciente"
          options={(residents.data ?? []).map((item: any) => ({ value: item.id, label: item.preferred_name || item.full_name }))}
        />
      </Card>

      {!resident ? (
        <div className="mt-6"><EmptyState title="Escolha um residente" hint="O prontuário é individual, imutável e auditável." /></div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
          <Card>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-olive" />
              <h2 className="text-lg font-semibold text-foreground">Novo registro</h2>
            </div>
            <div className="mt-3 space-y-3">
              <GlassSelect
                value={type}
                onChange={setType}
                options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              {isSoap ? (
                <>
                  <textarea value={form.subjective} onChange={(e) => setForm({ ...form, subjective: e.target.value })} rows={2} placeholder="S — Subjetivo (queixas, relato)" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                  <textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} rows={2} placeholder="O — Objetivo (exame físico, sinais vitais)" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                  <textarea value={form.assessment} onChange={(e) => setForm({ ...form, assessment: e.target.value })} rows={2} placeholder="A — Avaliação (hipóteses, diagnóstico)" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                  <textarea value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} rows={2} placeholder="P — Plano (conduta, exames, retorno)" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                </>
              ) : (
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder={`Conteúdo de ${TYPE_LABELS[type].toLowerCase()}...`} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              )}
              <input value={form.cid} onChange={(e) => setForm({ ...form, cid: e.target.value.toUpperCase() })} placeholder="CID-10 (ex.: I10, F03)" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending || !canSave}
                className="w-full rounded-full bg-olive px-4 py-2.5 text-sm font-semibold text-ivory disabled:opacity-50"
              >
                {save.isPending ? "Assinando..." : "Assinar e registrar"}
              </button>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Registros não podem ser editados nem apagados — correções entram como novas evoluções (versionamento clínico).
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-olive" />
              <h2 className="text-lg font-semibold text-foreground">Linha do tempo clínica — {residentLabel}</h2>
            </div>
            {(records.data ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum registro no prontuário ainda.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {(records.data ?? []).map((record: any) => (
                  <div key={record.id} className={`rounded-2xl border p-4 ${record.record_type === "alergia" ? "border-wine/30 bg-wine/5" : "border-white/70 bg-white/50"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Pill tone={record.record_type === "alergia" ? "wine" : record.record_type === "prescricao" ? "gold" : "olive"}>
                          {TYPE_LABELS[record.record_type] ?? record.record_type}
                        </Pill>
                        {record.cid_code && <Pill tone="muted">CID {record.cid_code}</Pill>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(record.created_at).toLocaleString("pt-BR")} · {record.author_role ? ROLE_LABELS[record.author_role as AppRole] ?? record.author_role : "-"}
                      </span>
                    </div>
                    {record.record_type === "soap" ? (
                      <dl className="mt-3 space-y-1.5 text-sm leading-6 text-foreground/85">
                        {record.subjective && <p><span className="font-semibold text-olive">S:</span> {record.subjective}</p>}
                        {record.objective && <p><span className="font-semibold text-olive">O:</span> {record.objective}</p>}
                        {record.assessment && <p><span className="font-semibold text-olive">A:</span> {record.assessment}</p>}
                        {record.plan && <p><span className="font-semibold text-olive">P:</span> {record.plan}</p>}
                      </dl>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/85">{record.content}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <code className="truncate text-[10px] text-muted-foreground">hash {record.signed_hash?.slice(0, 16)}…</code>
                      <button onClick={() => exportRecordPdf(record)} className="rounded-full border border-border bg-white/55 px-2.5 py-1 text-[11px] hover:bg-cream">
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
