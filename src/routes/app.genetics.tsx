import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dna, FileDown, PackageCheck, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/genetics")({ component: Genetics });

const KIT_STATUS: Array<{ key: string; label: string }> = [
  { key: "created", label: "Kit criado" },
  { key: "shipped", label: "Enviado" },
  { key: "delivered", label: "Entregue" },
  { key: "activated", label: "Ativado pelo paciente" },
  { key: "collected", label: "Amostra coletada" },
  { key: "in_transit", label: "Em transporte" },
  { key: "received", label: "Recebido no laboratório" },
];

const PIPELINE: Array<{ key: string; label: string }> = [
  { key: "extracao", label: "Extração de DNA" },
  { key: "controle_qualidade", label: "Controle de qualidade" },
  { key: "sequenciamento", label: "Sequenciamento" },
  { key: "bioinformatica", label: "Análise bioinformática" },
  { key: "interpretacao", label: "Interpretação" },
  { key: "revisao", label: "Revisão" },
  { key: "laudo_liberado", label: "Laudo liberado" },
];

function statusIndex(key: string) {
  const i = KIT_STATUS.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}
function pipelineIndex(key: string | null) {
  if (!key) return -1;
  return PIPELINE.findIndex((s) => s.key === key);
}

function Genetics() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, hasAnyRole } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const canUse = hasAnyRole(["doctor", "clinic_admin", "super_admin"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ patient_id: "", exam_id: "" });
  const [stepNote, setStepNote] = useState("");
  if (!canUse) return <Navigate to="/app" />;

  const tenantsList = useQuery({
    queryKey: ["gen-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["gen-patients", tenantId],
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

  const geneticExams = useQuery({
    queryKey: ["gen-exams", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name,genes_analyzed,requires_counseling,consent_required,sample_storage_policy")
        .eq("category", "genetica")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const kits = useQuery({
    queryKey: ["genetic-kits", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("genetic_kits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = (kits.data ?? []).find((k: any) => k.id === selectedId) ?? (kits.data ?? [])[0] ?? null;

  const events = useQuery({
    queryKey: ["genetic-kit-events", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("genetic_kit_events")
        .select("*")
        .eq("kit_id", selected!.id)
        .order("performed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x: any) => x.id === id);
    return p ? p.social_name || p.full_name : "Sem paciente";
  };
  const examOf = (id: string | null) => (geneticExams.data ?? []).find((x: any) => x.id === id) ?? null;
  const examName = (id: string | null) => {
    const e = examOf(id);
    return e ? e.commercial_name || e.name : "Teste genético";
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["genetic-kits", tenantId] });
    qc.invalidateQueries({ queryKey: ["genetic-kit-events", selected?.id] });
  };

  const logEvent = async (kitId: string, step: string, notes?: string) => {
    await (supabase as any).from("genetic_kit_events").insert({
      tenant_id: effTenant,
      kit_id: kitId,
      step,
      notes: notes || null,
      performed_by: user?.id ?? null,
    });
  };

  const createKit = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      if (!draft.patient_id) throw new Error("Selecione o paciente.");
      if (!draft.exam_id) throw new Error("Selecione o teste genético do catálogo.");
      const kit_code = `GEN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
      const { data, error } = await (supabase as any)
        .from("genetic_kits")
        .insert({
          tenant_id: effTenant,
          patient_id: draft.patient_id,
          exam_id: draft.exam_id,
          kit_code,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logEvent(data.id, "created", "Kit genético criado no sistema.");
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Kit genético criado com código de ativação");
      setDraft({ patient_id: "", exam_id: "" });
      setSelectedId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível criar o kit"),
  });

  const advanceStatus = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const idx = statusIndex(selected.status);
      if (idx >= KIT_STATUS.length - 1) throw new Error("O kit já chegou ao laboratório. Use o pipeline abaixo.");
      const next = KIT_STATUS[idx + 1];
      const exam = examOf(selected.exam_id);
      if (next.key === "collected" && exam?.consent_required && !selected.consent_accepted) {
        throw new Error("Este teste exige termo de consentimento aceito antes da coleta.");
      }
      const patch: Record<string, unknown> = { status: next.key };
      if (next.key === "activated") patch.activated_at = new Date().toISOString();
      const { error } = await (supabase as any).from("genetic_kits").update(patch).eq("id", selected.id);
      if (error) throw error;
      await logEvent(selected.id, next.key, stepNote.trim() || undefined);
      return next.label;
    },
    onSuccess: (label) => {
      if (label) toast.success(`Kit: ${label}`);
      setStepNote("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const advancePipeline = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      if (selected.status !== "received") throw new Error("O pipeline inicia após o kit ser recebido no laboratório.");
      const idx = pipelineIndex(selected.pipeline_step);
      if (idx >= PIPELINE.length - 1) throw new Error("Pipeline concluído — laudo liberado.");
      const next = PIPELINE[idx + 1];
      const { error } = await (supabase as any)
        .from("genetic_kits")
        .update({ pipeline_step: next.key })
        .eq("id", selected.id);
      if (error) throw error;
      await logEvent(selected.id, next.key, stepNote.trim() || undefined);
      return next.label;
    },
    onSuccess: (label) => {
      if (label) toast.success(`Pipeline: ${label}`);
      setStepNote("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const registerConsent = useMutation({
    mutationFn: async ({ storage, dataUse }: { storage: boolean; dataUse: boolean }) => {
      if (!selected) return;
      const { error } = await (supabase as any)
        .from("genetic_kits")
        .update({
          consent_accepted: true,
          consent_at: new Date().toISOString(),
          storage_authorized: storage,
          data_use_authorized: dataUse,
        })
        .eq("id", selected.id);
      if (error) throw error;
      await logEvent(
        selected.id,
        "consentimento",
        `Termo aceito. Armazenamento de amostra: ${storage ? "autorizado" : "negado"}. Uso de dados: ${dataUse ? "autorizado" : "negado"}.`,
      );
    },
    onSuccess: () => {
      toast.success("Consentimento registrado");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const requestDeletion = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      if (!window.confirm("Registrar solicitação de exclusão dos dados genéticos deste paciente?")) return;
      const { error } = await (supabase as any)
        .from("genetic_kits")
        .update({ deletion_requested: true, deletion_requested_at: new Date().toISOString() })
        .eq("id", selected.id);
      if (error) throw error;
      await logEvent(selected.id, "exclusao_solicitada", "Titular solicitou exclusão de dados e descarte da amostra (LGPD).");
    },
    onSuccess: () => {
      toast.success("Solicitação de exclusão registrada");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportKit = (k: any) => {
    const exam = examOf(k.exam_id);
    downloadPdf(`kit-${k.kit_code}.pdf`, `Kit genético ${k.kit_code}`, [
      `Paciente: ${patientName(k.patient_id)}`,
      `Teste: ${examName(k.exam_id)}`,
      exam?.genes_analyzed ? `Genes analisados: ${exam.genes_analyzed}` : "",
      `Status logístico: ${KIT_STATUS[statusIndex(k.status)].label}`,
      `Pipeline: ${k.pipeline_step ? PIPELINE[pipelineIndex(k.pipeline_step)].label : "não iniciado"}`,
      `Consentimento: ${k.consent_accepted ? `aceito em ${new Date(k.consent_at).toLocaleString("pt-BR")}` : "PENDENTE"}`,
      `Armazenamento de amostra: ${k.storage_authorized ? "autorizado" : "não autorizado"}`,
      `Uso de dados para pesquisa: ${k.data_use_authorized ? "autorizado" : "não autorizado"}`,
      k.deletion_requested ? `EXCLUSÃO SOLICITADA em ${new Date(k.deletion_requested_at).toLocaleString("pt-BR")}` : "",
      "",
      "Predisposição genética não significa diagnóstico. Resultados exigem interpretação profissional.",
    ].filter((l) => l !== ""));
  };

  const stats = useMemo(() => {
    const all = kits.data ?? [];
    return {
      logistics: all.filter((k: any) => ["created", "shipped", "delivered", "activated", "collected", "in_transit"].includes(k.status)).length,
      inPipeline: all.filter((k: any) => k.status === "received" && pipelineIndex(k.pipeline_step) < PIPELINE.length - 1).length,
      consentPending: all.filter((k: any) => !k.consent_accepted).length,
      deletions: all.filter((k: any) => k.deletion_requested).length,
    };
  }, [kits.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genética — kits e pipeline"
        subtitle="Kits com ativação por código, consentimento explícito, rastreamento logístico e pipeline até o laudo. Acesso restrito a médicos e administradores."
        action={<Pill tone="wine">Dados sensíveis</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Kits em logística" value={stats.logistics} sub="Do envio à chegada" tone="olive" />
        <Stat label="Em pipeline" value={stats.inPipeline} sub="Extração → laudo" tone="gold" />
        <Stat label="Consentimentos pendentes" value={stats.consentPending} sub="Bloqueiam a coleta" tone="wine" />
        <Stat label="Exclusões solicitadas" value={stats.deletions} sub="LGPD / descarte" tone="terracotta" />
      </div>

      <Card className="space-y-3 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Dna className="h-4 w-4" /> Novo kit genético
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <GlassSelect
            value={draft.patient_id}
            onChange={(v) => setDraft({ ...draft, patient_id: v })}
            placeholder="Paciente"
            options={(patients.data ?? []).map((p: any) => ({ value: p.id, label: p.social_name || p.full_name }))}
          />
          <GlassSelect
            value={draft.exam_id}
            onChange={(v) => setDraft({ ...draft, exam_id: v })}
            placeholder="Teste genético do catálogo"
            options={(geneticExams.data ?? []).map((e: any) => ({ value: e.id, label: e.commercial_name || e.name }))}
          />
          <button
            onClick={() => createKit.mutate()}
            disabled={createKit.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-olive px-4 py-2.5 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Gerar kit e código
          </button>
        </div>
        {(geneticExams.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum teste genético no catálogo ainda — crie na aba Genética do Catálogo de exames.
          </p>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Kits</h3>
          {(kits.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum kit ainda.</p>}
          {(kits.data ?? []).map((k: any) => (
            <button
              key={k.id}
              onClick={() => setSelectedId(k.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === k.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-foreground">{k.kit_code}</span>
                <Pill tone={k.deletion_requested ? "terracotta" : k.status === "received" ? "moss" : "gold"}>
                  {k.status === "received" && k.pipeline_step
                    ? PIPELINE[pipelineIndex(k.pipeline_step)].label
                    : KIT_STATUS[statusIndex(k.status)].label}
                </Pill>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-foreground">{patientName(k.patient_id)}</p>
              <p className="text-xs text-muted-foreground">{examName(k.exam_id)}</p>
            </button>
          ))}
        </Card>

        {selected ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-lg font-semibold text-foreground">{selected.kit_code}</h3>
                <p className="text-xs text-muted-foreground">
                  {patientName(selected.patient_id)} · {examName(selected.exam_id)}
                </p>
              </div>
              <button onClick={() => exportKit(selected)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                <FileDown className="h-3.5 w-3.5" /> Ficha do kit (PDF)
              </button>
            </div>

            {!selected.consent_accepted ? (
              <div className="space-y-3 rounded-2xl border border-wine/25 bg-wine/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-wine">
                  <ShieldCheck className="h-4 w-4" /> Consentimento pendente — obrigatório antes da coleta
                </p>
                <p className="text-xs text-muted-foreground">
                  Registre o aceite do titular ao termo de consentimento, informando as autorizações concedidas:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => registerConsent.mutate({ storage: true, dataUse: true })} className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory">
                    Aceite + armazenamento + uso de dados
                  </button>
                  <button onClick={() => registerConsent.mutate({ storage: true, dataUse: false })} className="rounded-full border border-border bg-white/55 px-4 py-1.5 text-xs">
                    Aceite + armazenamento
                  </button>
                  <button onClick={() => registerConsent.mutate({ storage: false, dataUse: false })} className="rounded-full border border-border bg-white/55 px-4 py-1.5 text-xs">
                    Somente aceite do teste
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs">
                <Pill tone="moss">Consentimento aceito {new Date(selected.consent_at).toLocaleDateString("pt-BR")}</Pill>
                <Pill tone={selected.storage_authorized ? "moss" : "muted"}>
                  Armazenamento {selected.storage_authorized ? "autorizado" : "negado"}
                </Pill>
                <Pill tone={selected.data_use_authorized ? "moss" : "muted"}>
                  Uso de dados {selected.data_use_authorized ? "autorizado" : "negado"}
                </Pill>
                {selected.deletion_requested && <Pill tone="terracotta">Exclusão solicitada</Pill>}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logística do kit</p>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {KIT_STATUS.map((s, i) => {
                  const current = statusIndex(selected.status);
                  const done = i <= current;
                  return (
                    <div
                      key={s.key}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                        i === current
                          ? "border-olive bg-olive/15 font-medium text-foreground"
                          : done
                            ? "border-moss/30 bg-moss/10 text-moss"
                            : "border-white/70 bg-white/40 text-muted-foreground"
                      }`}
                    >
                      <PackageCheck className={`h-3.5 w-3.5 flex-none ${done ? "" : "opacity-30"}`} />
                      <span className="truncate">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pipeline laboratorial {selected.status !== "received" ? "(inicia após recebimento)" : ""}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {PIPELINE.map((s, i) => {
                  const current = pipelineIndex(selected.pipeline_step);
                  const done = i <= current;
                  return (
                    <div
                      key={s.key}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        i === current
                          ? "border-olive bg-olive/15 font-medium text-foreground"
                          : done
                            ? "border-moss/30 bg-moss/10 text-moss"
                            : "border-white/70 bg-white/40 text-muted-foreground"
                      }`}
                    >
                      {i + 1}. {s.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={stepNote}
                onChange={(e) => setStepNote(e.target.value)}
                placeholder="Observação da etapa (opcional)"
                className="min-w-64 flex-1 rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
              />
              {selected.status !== "received" ? (
                <button
                  onClick={() => advanceStatus.mutate()}
                  disabled={advanceStatus.isPending}
                  className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                >
                  Avançar logística →
                </button>
              ) : (
                <button
                  onClick={() => advancePipeline.mutate()}
                  disabled={advancePipeline.isPending}
                  className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                >
                  Avançar pipeline →
                </button>
              )}
              {!selected.deletion_requested && (
                <button
                  onClick={() => requestDeletion.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/40 bg-terracotta/5 px-4 py-2 text-xs text-terracotta"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Registrar pedido de exclusão
                </button>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Trilha de auditoria</h4>
              <div className="mt-2 space-y-1.5">
                {(events.data ?? []).map((e: any) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">
                      {KIT_STATUS.find((x) => x.key === e.step)?.label ??
                        PIPELINE.find((x) => x.key === e.step)?.label ??
                        (e.step === "consentimento" ? "Consentimento" : e.step === "exclusao_solicitada" ? "Exclusão solicitada" : e.step)}
                    </span>
                    <span className="text-muted-foreground">{new Date(e.performed_at).toLocaleString("pt-BR")}</span>
                    {e.notes && <span className="w-full text-muted-foreground">{e.notes}</span>}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Predisposição não significa diagnóstico. {examOf(selected.exam_id)?.requires_counseling
                ? "Este teste recomenda aconselhamento genético antes e após o resultado."
                : ""}
            </p>
          </Card>
        ) : (
          <EmptyState title="Nenhum kit selecionado" hint="Crie um kit genético para iniciar logística, consentimento e pipeline." />
        )}
      </div>
    </div>
  );
}
