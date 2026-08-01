import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileDown, FileSignature, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/reports")({ component: Reports });

const STATUS_FLOW = ["draft", "review", "validated", "signed", "released"] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  validated: "Validado",
  signed: "Assinado",
  released: "Liberado",
};
const NEXT_ACTION: Record<string, string> = {
  draft: "Enviar para revisão",
  review: "Validar tecnicamente",
  validated: "Assinar laudo",
  signed: "Liberar ao paciente",
};

async function sha256Hex(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function Reports() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, hasAnyRole } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const canSign = hasAnyRole(["doctor", "clinic_admin", "super_admin"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [draft, setDraft] = useState({
    patient_id: "",
    exam_id: "",
    sample_id: "",
    title: "",
    result_text: "",
    reference_values: "",
    comments: "",
    is_critical: false,
  });
  const [amending, setAmending] = useState(false);
  const [contactNote, setContactNote] = useState("");

  const tenantsList = useQuery({
    queryKey: ["reports-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["reports-patients", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("id,full_name,social_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const exams = useQuery({
    queryKey: ["reports-exams", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const samples = useQuery({
    queryKey: ["reports-samples", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("samples")
        .select("id,barcode,patient_id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reports = useQuery({
    queryKey: ["lab-reports", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lab_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected =
    (reports.data ?? []).find((r: any) => r.id === selectedId) ?? (reports.data ?? [])[0] ?? null;

  const critical = useQuery({
    queryKey: ["critical-results", selected?.id],
    enabled: !!selected?.is_critical,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("critical_results")
        .select("*")
        .eq("report_id", selected!.id)
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x: any) => x.id === id);
    return p ? p.social_name || p.full_name : "Sem paciente";
  };
  const examName = (id: string | null) => {
    const e = (exams.data ?? []).find((x: any) => x.id === id);
    return e ? e.commercial_name || e.name : "";
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lab-reports", tenantId] });
    qc.invalidateQueries({ queryKey: ["critical-results", selected?.id] });
  };

  const createReport = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      if (!draft.patient_id) throw new Error("Selecione o paciente.");
      if (!draft.title.trim()) throw new Error("Informe o título do laudo.");
      if (!draft.result_text.trim()) throw new Error("Informe o resultado técnico.");
      const base: Record<string, unknown> = {
        tenant_id: effTenant,
        patient_id: draft.patient_id,
        exam_id: draft.exam_id || null,
        sample_id: draft.sample_id || null,
        title: draft.title.trim(),
        result_text: draft.result_text.trim(),
        reference_values: draft.reference_values.trim() || null,
        comments: draft.comments.trim() || null,
        is_critical: draft.is_critical,
        created_by: user?.id ?? null,
      };
      if (amending && selected) {
        base.previous_version_id = selected.id;
        base.version = (selected.version ?? 1) + 1;
        base.kind = "retificacao";
      }
      const { data, error } = await (supabase as any).from("lab_reports").insert(base).select("id").single();
      if (error) throw error;
      if (draft.is_critical) {
        await (supabase as any).from("critical_results").insert({
          tenant_id: effTenant,
          report_id: data.id,
          patient_id: draft.patient_id,
          created_by: user?.id ?? null,
        });
        await (supabase as any).from("alerts").insert({
          tenant_id: effTenant,
          title: `Resultado crítico — ${patientName(draft.patient_id)}`,
          description: `Laudo "${draft.title.trim()}" marcado como crítico. Protocolo de comunicação aberto.`,
          severity: "critical",
          category: "lab",
          status: "open",
          created_by: user?.id ?? null,
        });
      }
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success(amending ? "Retificação criada como nova versão" : "Laudo criado como rascunho");
      setDraft({ patient_id: "", exam_id: "", sample_id: "", title: "", result_text: "", reference_values: "", comments: "", is_critical: false });
      setOpenForm(false);
      setAmending(false);
      setSelectedId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível criar o laudo"),
  });

  const advance = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const idx = STATUS_FLOW.indexOf(selected.status);
      if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
      const next = STATUS_FLOW[idx + 1];
      if (next === "signed" && !canSign) throw new Error("Somente médicos ou administradores assinam laudos.");
      if (next === "released" && selected.is_critical) {
        const c = critical.data;
        const attempts = Array.isArray(c?.contact_attempts) ? c.contact_attempts : [];
        if (!c || (c.status !== "closed" && attempts.length === 0)) {
          throw new Error("Resultado crítico: registre ao menos um contato realizado antes de liberar.");
        }
      }
      const patch: Record<string, unknown> = { status: next };
      if (next === "signed") {
        patch.signed_by = user?.id ?? null;
        patch.signed_at = new Date().toISOString();
        patch.signed_hash = await sha256Hex(
          `${selected.id}|${selected.title}|${selected.result_text}|${user?.id}|${Date.now()}`,
        );
      }
      if (next === "released") patch.released_at = new Date().toISOString();
      const { error } = await (supabase as any).from("lab_reports").update(patch).eq("id", selected.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      if (next) toast.success(`Laudo: ${STATUS_LABEL[next]}`);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const registerContact = useMutation({
    mutationFn: async () => {
      if (!selected || !critical.data) throw new Error("Protocolo crítico não encontrado.");
      if (!contactNote.trim()) throw new Error("Descreva o contato (quem foi comunicado e como).");
      const attempts = Array.isArray(critical.data.contact_attempts) ? critical.data.contact_attempts : [];
      const { error } = await (supabase as any)
        .from("critical_results")
        .update({
          status: "contacting",
          contact_attempts: [
            ...attempts,
            { at: new Date().toISOString(), by: user?.id ?? null, note: contactNote.trim() },
          ],
        })
        .eq("id", critical.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato registrado no protocolo crítico");
      setContactNote("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeCritical = useMutation({
    mutationFn: async () => {
      if (!critical.data) return;
      const { error } = await (supabase as any)
        .from("critical_results")
        .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: user?.id ?? null })
        .eq("id", critical.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Protocolo crítico encerrado");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startAmend = () => {
    if (!selected) return;
    setAmending(true);
    setDraft({
      patient_id: selected.patient_id ?? "",
      exam_id: selected.exam_id ?? "",
      sample_id: selected.sample_id ?? "",
      title: selected.title,
      result_text: selected.result_text ?? "",
      reference_values: selected.reference_values ?? "",
      comments: selected.comments ?? "",
      is_critical: selected.is_critical,
    });
    setOpenForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportPdf = (r: any) => {
    downloadPdf(`laudo-${r.title}.pdf`, r.title, [
      `Paciente: ${patientName(r.patient_id)}`,
      r.exam_id ? `Exame: ${examName(r.exam_id)}` : "",
      `Versão: ${r.version}${r.kind === "retificacao" ? " (retificação)" : ""}`,
      `Status: ${STATUS_LABEL[r.status] ?? r.status}${r.is_critical ? " · RESULTADO CRÍTICO" : ""}`,
      `Emitido em: ${new Date(r.created_at).toLocaleString("pt-BR")}`,
      r.signed_at ? `Assinado em: ${new Date(r.signed_at).toLocaleString("pt-BR")}` : "",
      "",
      "Resultado:",
      ...(r.result_text ?? "").split("\n"),
      "",
      r.reference_values ? `Valores de referência: ${r.reference_values}` : "",
      r.comments ? `Comentários: ${r.comments}` : "",
      "",
      r.signed_hash ? `Verificação (SHA-256): ${r.signed_hash}` : "",
      "Este laudo não substitui a interpretação do seu médico.",
    ].filter((l) => l !== ""));
  };

  const stats = useMemo(() => {
    const all = reports.data ?? [];
    return {
      drafts: all.filter((r: any) => ["draft", "review"].includes(r.status)).length,
      toSign: all.filter((r: any) => r.status === "validated").length,
      released: all.filter((r: any) => r.status === "released").length,
      critical: all.filter((r: any) => r.is_critical && r.status !== "released").length,
    };
  }, [reports.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laudos e resultados"
        subtitle="Laudos versionados com revisão, validação, assinatura com hash e liberação — críticos só saem após contato registrado."
        action={
          <button
            onClick={() => {
              setAmending(false);
              setOpenForm(!openForm);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo laudo
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Em elaboração" value={stats.drafts} sub="Rascunhos e revisão" tone="gold" />
        <Stat label="Aguardando assinatura" value={stats.toSign} sub="Validados" tone="olive" />
        <Stat label="Críticos pendentes" value={stats.critical} sub="Protocolo aberto" tone="wine" />
        <Stat label="Liberados" value={stats.released} sub="Visíveis ao paciente" tone="moss" />
      </div>

      {openForm && (
        <Card className="space-y-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">
            {amending ? `Retificação — nova versão de "${selected?.title}"` : "Novo laudo"}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <GlassSelect
              value={draft.patient_id}
              onChange={(v) => setDraft({ ...draft, patient_id: v })}
              placeholder="Paciente *"
              options={(patients.data ?? []).map((p: any) => ({ value: p.id, label: p.social_name || p.full_name }))}
            />
            <GlassSelect
              value={draft.exam_id}
              onChange={(v) => setDraft({ ...draft, exam_id: v })}
              placeholder="Exame (opcional)"
              options={[{ value: "", label: "Sem exame vinculado" }, ...(exams.data ?? []).map((e: any) => ({ value: e.id, label: e.commercial_name || e.name }))]}
            />
            <GlassSelect
              value={draft.sample_id}
              onChange={(v) => setDraft({ ...draft, sample_id: v })}
              placeholder="Amostra (opcional)"
              options={[{ value: "", label: "Sem amostra vinculada" }, ...(samples.data ?? []).filter((s: any) => !draft.patient_id || s.patient_id === draft.patient_id).map((s: any) => ({ value: s.id, label: s.barcode }))]}
            />
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Título do laudo * (ex.: Hemograma completo)"
            className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
          />
          <textarea
            value={draft.result_text}
            onChange={(e) => setDraft({ ...draft, result_text: e.target.value })}
            rows={6}
            placeholder={"Resultado técnico *\nUma linha por analito, ex.:\nHemoglobina: 14,2 g/dL\nLeucócitos: 6.800/mm³"}
            className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <textarea
              value={draft.reference_values}
              onChange={(e) => setDraft({ ...draft, reference_values: e.target.value })}
              rows={3}
              placeholder="Valores de referência"
              className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
            />
            <textarea
              value={draft.comments}
              onChange={(e) => setDraft({ ...draft, comments: e.target.value })}
              rows={3}
              placeholder="Comentários e observações"
              className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, is_critical: !draft.is_critical })}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
              draft.is_critical
                ? "border-wine bg-wine text-ivory shadow-soft"
                : "border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {draft.is_critical ? "Resultado crítico — protocolo será aberto" : "Marcar como resultado crítico"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => createReport.mutate()}
              disabled={createReport.isPending}
              className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
            >
              {createReport.isPending ? "Salvando..." : amending ? "Criar retificação" : "Criar laudo"}
            </button>
            <button onClick={() => { setOpenForm(false); setAmending(false); }} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Laudos recentes</h3>
          {(reports.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum laudo ainda.</p>}
          {(reports.data ?? []).map((r: any) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === r.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                <Pill tone={r.status === "released" ? "moss" : r.is_critical ? "wine" : "gold"}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {patientName(r.patient_id)} · v{r.version}
                {r.kind === "retificacao" ? " (retificação)" : ""}
              </p>
            </button>
          ))}
        </Card>

        {selected ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selected.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {patientName(selected.patient_id)}
                  {selected.exam_id ? ` · ${examName(selected.exam_id)}` : ""} · versão {selected.version}
                  {selected.kind === "retificacao" ? " (retificação)" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.is_critical && <Pill tone="wine">Crítico</Pill>}
                <Pill tone={selected.status === "released" ? "moss" : "gold"}>{STATUS_LABEL[selected.status]}</Pill>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STATUS_FLOW.map((s, i) => {
                const idx = STATUS_FLOW.indexOf(selected.status);
                return (
                  <span
                    key={s}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      i <= idx ? "border-moss/40 bg-moss/10 text-moss" : "border-white/70 bg-white/40 text-muted-foreground"
                    }`}
                  >
                    {i + 1}. {STATUS_LABEL[s]}
                  </span>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/45 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{selected.result_text}</p>
              {selected.reference_values && (
                <p className="mt-3 text-xs text-muted-foreground">Referência: {selected.reference_values}</p>
              )}
              {selected.comments && (
                <p className="mt-1 text-xs text-muted-foreground">Comentários: {selected.comments}</p>
              )}
              {selected.signed_hash && (
                <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">
                  Assinatura SHA-256: {selected.signed_hash}
                </p>
              )}
            </div>

            {selected.is_critical && (
              <div className="space-y-3 rounded-2xl border border-wine/25 bg-wine/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-wine">
                  <AlertTriangle className="h-4 w-4" /> Protocolo de resultado crítico —{" "}
                  {critical.data?.status === "closed" ? "encerrado" : critical.data?.status === "contacting" ? "em contato" : "aberto"}
                </p>
                {(Array.isArray(critical.data?.contact_attempts) ? critical.data.contact_attempts : []).map(
                  (a: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {new Date(a.at).toLocaleString("pt-BR")} — {a.note}
                    </p>
                  ),
                )}
                {critical.data?.status !== "closed" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={contactNote}
                      onChange={(e) => setContactNote(e.target.value)}
                      placeholder="Quem foi comunicado, por qual meio e horário"
                      className="min-w-64 flex-1 rounded-xl border border-border bg-ivory px-3 py-2 text-xs"
                    />
                    <button onClick={() => registerContact.mutate()} className="rounded-full bg-wine px-4 py-1.5 text-xs font-medium text-ivory">
                      Registrar contato
                    </button>
                    <button onClick={() => closeCritical.mutate()} className="rounded-full border border-wine/30 px-4 py-1.5 text-xs text-wine">
                      Encerrar protocolo
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {NEXT_ACTION[selected.status] && (
                <button
                  onClick={() => advance.mutate()}
                  disabled={advance.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-olive px-5 py-2 text-xs font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                >
                  <FileSignature className="h-3.5 w-3.5" /> {NEXT_ACTION[selected.status]}
                </button>
              )}
              {["signed", "released"].includes(selected.status) && (
                <button onClick={startAmend} className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                  Criar retificação (nova versão)
                </button>
              )}
              <button onClick={() => exportPdf(selected)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                <FileDown className="h-3.5 w-3.5" /> Laudo em PDF
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Laudos assinados são imutáveis: correções geram uma nova versão preservando a anterior. Pacientes e
              autorizados só enxergam laudos liberados.
            </p>
          </Card>
        ) : (
          <EmptyState title="Nenhum laudo selecionado" hint="Crie um laudo para iniciar o fluxo de revisão, assinatura e liberação." />
        )}
      </div>
    </div>
  );
}
