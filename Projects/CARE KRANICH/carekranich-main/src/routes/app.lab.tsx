import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Barcode, CheckCircle2, FileDown, FlaskConical, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/lab")({ component: Lab });

const STAGES: Array<{ key: string; label: string }> = [
  { key: "pedido_recebido", label: "Pedido recebido" },
  { key: "cadastro_validado", label: "Cadastro validado" },
  { key: "agendamento_confirmado", label: "Agendamento confirmado" },
  { key: "paciente_identificado", label: "Paciente identificado" },
  { key: "coleta_realizada", label: "Coleta realizada" },
  { key: "etiqueta_vinculada", label: "Etiqueta vinculada" },
  { key: "amostra_transportada", label: "Transporte" },
  { key: "amostra_recebida", label: "Recebida no laboratório" },
  { key: "triagem_tecnica", label: "Triagem técnica" },
  { key: "centrifugacao", label: "Centrifugação" },
  { key: "separacao", label: "Separação" },
  { key: "aliquota", label: "Alíquota" },
  { key: "processamento", label: "Processamento" },
  { key: "controle_qualidade", label: "Controle de qualidade" },
  { key: "analise", label: "Análise" },
  { key: "revisao", label: "Revisão" },
  { key: "validacao_tecnica", label: "Validação técnica" },
  { key: "validacao_clinica", label: "Validação clínica" },
  { key: "assinatura", label: "Assinatura" },
  { key: "liberacao", label: "Liberação" },
  { key: "comunicacao", label: "Comunicação" },
  { key: "arquivamento", label: "Arquivamento" },
  { key: "descarte", label: "Descarte" },
];

const MATERIALS = [
  "Sangue total",
  "Soro",
  "Plasma",
  "Urina",
  "Fezes",
  "Saliva / swab",
  "Tecido",
  "Outro",
];

function stageIndex(key: string) {
  const i = STAGES.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}

function Lab() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ patient_id: "", exam_id: "", material: "Sangue total" });
  const [stageNote, setStageNote] = useState("");

  const tenantsList = useQuery({
    queryKey: ["lab-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["lab-patients", tenantId],
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
    queryKey: ["lab-exams", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name,biological_material,category")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const samples = useQuery({
    queryKey: ["lab-samples", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("samples")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected =
    (samples.data ?? []).find((s: any) => s.id === selectedId) ?? (samples.data ?? [])[0] ?? null;

  const events = useQuery({
    queryKey: ["lab-sample-events", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sample_events")
        .select("*")
        .eq("sample_id", selected!.id)
        .order("performed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["lab-members", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("id,full_name,preferred_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const memberName = (id: string | null) => {
    const m = (members.data ?? []).find((x: any) => x.id === id);
    return m ? m.preferred_name || m.full_name || "Usuário" : "—";
  };

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x: any) => x.id === id);
    return p ? p.social_name || p.full_name : "Sem paciente";
  };

  const examName = (id: string | null) => {
    const e = (exams.data ?? []).find((x: any) => x.id === id);
    return e ? e.commercial_name || e.name : "Exame";
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lab-samples", tenantId] });
    qc.invalidateQueries({ queryKey: ["lab-sample-events", selected?.id] });
  };

  const createSample = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      if (!draft.patient_id) throw new Error("Selecione o paciente.");
      if (!draft.exam_id) throw new Error("Selecione o exame.");
      const barcode = `CK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const { data, error } = await (supabase as any)
        .from("samples")
        .insert({
          tenant_id: effTenant,
          patient_id: draft.patient_id,
          exam_id: draft.exam_id,
          material: draft.material,
          barcode,
          collected_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await (supabase as any).from("sample_events").insert({
        tenant_id: effTenant,
        sample_id: data.id,
        stage: "pedido_recebido",
        notes: "Amostra registrada no sistema.",
        performed_by: user?.id ?? null,
      });
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Amostra registrada com código de barras");
      setDraft({ patient_id: "", exam_id: "", material: "Sangue total" });
      setSelectedId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível registrar a amostra"),
  });

  const advance = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const idx = stageIndex(selected.current_stage);
      if (idx >= STAGES.length - 1) throw new Error("A amostra já concluiu todas as etapas.");
      const next = STAGES[idx + 1];
      const { error } = await (supabase as any)
        .from("samples")
        .update({
          current_stage: next.key,
          status: next.key === "descarte" ? "completed" : selected.status,
          collected_at: next.key === "coleta_realizada" ? new Date().toISOString() : selected.collected_at,
        })
        .eq("id", selected.id);
      if (error) throw error;
      await (supabase as any).from("sample_events").insert({
        tenant_id: selected.tenant_id,
        sample_id: selected.id,
        stage: next.key,
        notes: stageNote.trim() || null,
        performed_by: user?.id ?? null,
      });
      return next.label;
    },
    onSuccess: (label) => {
      if (label) toast.success(`Etapa registrada: ${label}`);
      setStageNote("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const reason = window.prompt("Motivo da rejeição da amostra (ex.: hemólise, volume insuficiente):");
      if (!reason || !reason.trim()) throw new Error("Informe o motivo da rejeição.");
      const { error } = await (supabase as any)
        .from("samples")
        .update({ status: "rejected", rejection_reason: reason.trim() })
        .eq("id", selected.id);
      if (error) throw error;
      await (supabase as any).from("sample_events").insert({
        tenant_id: selected.tenant_id,
        sample_id: selected.id,
        stage: selected.current_stage,
        status: "rejected",
        notes: `Amostra rejeitada: ${reason.trim()}. Necessária recoleta.`,
        performed_by: user?.id ?? null,
      });
      await (supabase as any).from("alerts").insert({
        tenant_id: selected.tenant_id,
        title: `Recoleta necessária — ${patientName(selected.patient_id)}`,
        description: `Amostra ${selected.barcode} (${examName(selected.exam_id)}) rejeitada: ${reason.trim()}`,
        severity: "high",
        category: "lab",
        status: "open",
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Rejeição registrada — alerta de recoleta criado");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (samples.data ?? []).filter((s: any) => {
      if (!q) return true;
      return [s.barcode, patientName(s.patient_id), examName(s.exam_id), s.material]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [samples.data, search, patients.data, exams.data]);

  const exportSample = (s: any) => {
    const evts = s.id === selected?.id ? (events.data ?? []) : [];
    downloadPdf(`amostra-${s.barcode}.pdf`, `Amostra ${s.barcode}`, [
      `Paciente: ${patientName(s.patient_id)}`,
      `Exame: ${examName(s.exam_id)}`,
      `Material: ${s.material ?? "-"}`,
      `Etapa atual: ${STAGES[stageIndex(s.current_stage)].label}`,
      `Status: ${s.status === "rejected" ? `REJEITADA (${s.rejection_reason})` : s.status === "completed" ? "Concluída" : "Em andamento"}`,
      `Registrada em: ${new Date(s.created_at).toLocaleString("pt-BR")}`,
      "",
      "Cadeia de custódia:",
      ...evts.map(
        (e: any) =>
          `- ${new Date(e.performed_at).toLocaleString("pt-BR")} · ${STAGES.find((x) => x.key === e.stage)?.label ?? e.stage} · ${memberName(e.performed_by)}${e.notes ? ` · ${e.notes}` : ""}`,
      ),
    ]);
  };

  const stats = useMemo(() => {
    const all = samples.data ?? [];
    return {
      inProgress: all.filter((s: any) => s.status === "in_progress").length,
      rejected: all.filter((s: any) => s.status === "rejected").length,
      awaitingValidation: all.filter((s: any) => ["validacao_tecnica", "validacao_clinica", "assinatura"].includes(s.current_stage)).length,
      released: all.filter((s: any) => stageIndex(s.current_stage) >= stageIndex("liberacao")).length,
    };
  }, [samples.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laboratório — amostras"
        subtitle="Rastreabilidade completa: cada amostra percorre as 23 etapas com registro de usuário, hora e observação."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Em andamento" value={stats.inProgress} sub="Amostras ativas" tone="olive" />
        <Stat label="Aguardando validação" value={stats.awaitingValidation} sub="Técnica, clínica ou assinatura" tone="gold" />
        <Stat label="Rejeitadas" value={stats.rejected} sub="Recoleta necessária" tone="wine" />
        <Stat label="Liberadas" value={stats.released} sub="Resultado comunicável" tone="moss" />
      </div>

      <Card className="space-y-3 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FlaskConical className="h-4 w-4" /> Registrar nova amostra
        </h3>
        <div className="grid gap-3 md:grid-cols-4">
          <GlassSelect
            value={draft.patient_id}
            onChange={(v) => setDraft({ ...draft, patient_id: v })}
            placeholder="Paciente"
            options={(patients.data ?? []).map((p: any) => ({ value: p.id, label: p.social_name || p.full_name }))}
          />
          <GlassSelect
            value={draft.exam_id}
            onChange={(v) => {
              const e = (exams.data ?? []).find((x: any) => x.id === v);
              setDraft({ ...draft, exam_id: v, material: e?.biological_material || draft.material });
            }}
            placeholder="Exame"
            options={(exams.data ?? []).map((e: any) => ({ value: e.id, label: e.commercial_name || e.name }))}
          />
          <GlassSelect
            value={draft.material}
            onChange={(v) => setDraft({ ...draft, material: v })}
            options={MATERIALS.map((m) => ({ value: m, label: m }))}
          />
          <button
            onClick={() => createSample.mutate()}
            disabled={createSample.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-olive px-4 py-2.5 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Gerar código e registrar
          </button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="space-y-2 p-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, paciente, exame..."
            className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
          />
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma amostra encontrada.</p>}
          {filtered.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === s.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground">
                  <Barcode className="h-3.5 w-3.5" /> {s.barcode}
                </span>
                <Pill tone={s.status === "rejected" ? "wine" : s.status === "completed" ? "moss" : "gold"}>
                  {s.status === "rejected" ? "rejeitada" : s.status === "completed" ? "concluída" : `${stageIndex(s.current_stage) + 1}/23`}
                </Pill>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-foreground">{patientName(s.patient_id)}</p>
              <p className="text-xs text-muted-foreground">{examName(s.exam_id)} · {s.material ?? "material n/d"}</p>
            </button>
          ))}
        </Card>

        {selected ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-lg font-semibold text-foreground">{selected.barcode}</h3>
                <p className="text-xs text-muted-foreground">
                  {patientName(selected.patient_id)} · {examName(selected.exam_id)} · {selected.material ?? "material n/d"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportSample(selected)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                  <FileDown className="h-3.5 w-3.5" /> Cadeia de custódia (PDF)
                </button>
              </div>
            </div>

            {selected.status === "rejected" && (
              <div className="rounded-2xl border border-wine/25 bg-wine/5 p-4 text-sm text-wine">
                Amostra rejeitada: {selected.rejection_reason}. Alerta de recoleta criado.
              </div>
            )}

            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {STAGES.map((stage, i) => {
                const current = stageIndex(selected.current_stage);
                const done = i <= current;
                const isCurrent = i === current;
                return (
                  <div
                    key={stage.key}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                      isCurrent
                        ? "border-olive bg-olive/15 font-medium text-foreground"
                        : done
                          ? "border-moss/30 bg-moss/10 text-moss"
                          : "border-white/70 bg-white/40 text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 flex-none" /> : <span className="h-3.5 w-3.5 flex-none rounded-full border border-border" />}
                    <span className="truncate">{i + 1}. {stage.label}</span>
                  </div>
                );
              })}
            </div>

            {selected.status === "in_progress" && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="Observação da etapa (opcional)"
                  className="min-w-64 flex-1 rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
                />
                <button
                  onClick={() => advance.mutate()}
                  disabled={advance.isPending}
                  className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                >
                  Avançar etapa →
                </button>
                <button
                  onClick={() => reject.mutate()}
                  disabled={reject.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-wine/30 bg-wine/5 px-4 py-2 text-sm text-wine"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Rejeitar amostra
                </button>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-foreground">Histórico (cadeia de custódia)</h4>
              <div className="mt-2 space-y-1.5">
                {(events.data ?? []).map((e: any) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">
                      {STAGES.find((x) => x.key === e.stage)?.label ?? e.stage}
                      {e.status === "rejected" ? " · REJEIÇÃO" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(e.performed_at).toLocaleString("pt-BR")} · {memberName(e.performed_by)}
                    </span>
                    {e.notes && <span className="w-full text-muted-foreground">{e.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState title="Nenhuma amostra selecionada" hint="Registre uma amostra para iniciar o fluxo de 23 etapas." />
        )}
      </div>
    </div>
  );
}
