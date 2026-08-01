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
  { key: "pedido_recebido", label: "Order received" },
  { key: "cadastro_validado", label: "Registration validated" },
  { key: "agendamento_confirmado", label: "Appointment confirmed" },
  { key: "paciente_identificado", label: "Patient identified" },
  { key: "coleta_realizada", label: "Collection completed" },
  { key: "etiqueta_vinculada", label: "Label linked" },
  { key: "amostra_transportada", label: "Transport" },
  { key: "amostra_recebida", label: "Received by laboratory" },
  { key: "triagem_tecnica", label: "Technical screening" },
  { key: "centrifugacao", label: "Centrifugation" },
  { key: "separacao", label: "Separation" },
  { key: "aliquota", label: "Aliquot" },
  { key: "processamento", label: "Processing" },
  { key: "controle_qualidade", label: "Quality control" },
  { key: "analise", label: "Analysis" },
  { key: "revisao", label: "Review" },
  { key: "validacao_tecnica", label: "Technical validation" },
  { key: "validacao_clinica", label: "Clinical validation" },
  { key: "assinatura", label: "Signature" },
  { key: "liberacao", label: "Release" },
  { key: "comunicacao", label: "Communication" },
  { key: "arquivamento", label: "Archiving" },
  { key: "descarte", label: "Disposal" },
];

const MATERIALS = [
  "Whole blood",
  "Soro",
  "Plasma",
  "Urine",
  "Stool",
  "Saliva / swab",
  "Tissue",
  "Other",
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
  const [draft, setDraft] = useState({ patient_id: "", exam_id: "", material: "Whole blood" });
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
    return m ? m.preferred_name || m.full_name || "User" : "-";
  };

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x: any) => x.id === id);
    return p ? p.social_name || p.full_name : "No patient";
  };

  const examName = (id: string | null) => {
    const exam = (exams.data ?? []).find((x: any) => x.id === id);
    return exam ? exam.commercial_name || exam.name : "Exam";
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lab-samples", tenantId] });
    qc.invalidateQueries({ queryKey: ["lab-sample-events", selected?.id] });
  };

  const createSample = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("No organization available.");
      if (!draft.patient_id) throw new Error("Select the patient.");
      if (!draft.exam_id) throw new Error("Select the exam.");
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
        notes: "Sample registered in the system.",
        performed_by: user?.id ?? null,
      });
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Sample registered with barcode");
      setDraft({ patient_id: "", exam_id: "", material: "Whole blood" });
      setSelectedId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not register the sample"),
  });

  const advance = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const idx = stageIndex(selected.current_stage);
      if (idx >= STAGES.length - 1) throw new Error("The sample has already completed all stages.");
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
      if (label) toast.success(`Stage recorded: ${label}`);
      setStageNote("");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const reason = window.prompt("Sample rejection reason (e.g. hemolysis, insufficient volume):");
      if (!reason || !reason.trim()) throw new Error("Enter the rejection reason.");
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
        notes: `Sample rejected: ${reason.trim()}. Recollection required.`,
        performed_by: user?.id ?? null,
      });
      await (supabase as any).from("alerts").insert({
        tenant_id: selected.tenant_id,
        title: `Recollection required - ${patientName(selected.patient_id)}`,
        description: `Sample ${selected.barcode} (${examName(selected.exam_id)}) rejected: ${reason.trim()}`,
        severity: "high",
        category: "lab",
        status: "open",
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Rejection registered - recollection alert created");
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
    downloadPdf(`sample-${s.barcode}.pdf`, `Sample ${s.barcode}`, [
      `Patient: ${patientName(s.patient_id)}`,
      `Exam: ${examName(s.exam_id)}`,
      `Material: ${s.material ?? "-"}`,
      `Current stage: ${STAGES[stageIndex(s.current_stage)].label}`,
      `Status: ${s.status === "rejected" ? `REJECTED (${s.rejection_reason})` : s.status === "completed" ? "Completed" : "In progress"}`,
      `Registered on: ${new Date(s.created_at).toLocaleString("en-US")}`,
      "",
      "Chain of custody:",
      ...evts.map(
        (e: any) =>
          `- ${new Date(e.performed_at).toLocaleString("en-US")} - ${STAGES.find((x) => x.key === e.stage)?.label ?? e.stage} - ${memberName(e.performed_by)}${e.notes ? ` - ${e.notes}` : ""}`,
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
        title="Laboratory - samples"
        subtitle="Full traceability: each sample goes through 23 stages with user, time and note records."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="In progress" value={stats.inProgress} sub="Active samples" tone="olive" />
        <Stat label="Awaiting validation" value={stats.awaitingValidation} sub="Technical, clinical or signature" tone="gold" />
        <Stat label="Rejected" value={stats.rejected} sub="Recollection needed" tone="wine" />
        <Stat label="Released" value={stats.released} sub="Communicable result" tone="moss" />
      </div>

      <Card className="space-y-3 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FlaskConical className="h-4 w-4" /> Register new sample
        </h3>
        <div className="grid gap-3 md:grid-cols-4">
          <GlassSelect
            value={draft.patient_id}
            onChange={(v) => setDraft({ ...draft, patient_id: v })}
            placeholder="Patient"
            options={(patients.data ?? []).map((p: any) => ({ value: p.id, label: p.social_name || p.full_name }))}
          />
          <GlassSelect
            value={draft.exam_id}
            onChange={(v) => {
              const exam = (exams.data ?? []).find((x: any) => x.id === v);
              setDraft({ ...draft, exam_id: v, material: exam?.biological_material || draft.material });
            }}
            placeholder="Exam"
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
            <Plus className="h-4 w-4" /> Generate code and register
          </button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="space-y-2 p-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, patient, exam..."
            className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
          />
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No sample found.</p>}
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
                  {s.status === "rejected" ? "rejected" : s.status === "completed" ? "completed" : `${stageIndex(s.current_stage) + 1}/23`}
                </Pill>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-foreground">{patientName(s.patient_id)}</p>
              <p className="text-xs text-muted-foreground">{examName(s.exam_id)} - {s.material ?? "material n/a"}</p>
            </button>
          ))}
        </Card>

        {selected ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-lg font-semibold text-foreground">{selected.barcode}</h3>
                <p className="text-xs text-muted-foreground">
                  {patientName(selected.patient_id)} - {examName(selected.exam_id)} - {selected.material ?? "material n/a"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportSample(selected)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                  <FileDown className="h-3.5 w-3.5" /> Chain of custody (PDF)
                </button>
              </div>
            </div>

            {selected.status === "rejected" && (
              <div className="rounded-2xl border border-wine/25 bg-wine/5 p-4 text-sm text-wine">
                Sample rejected: {selected.rejection_reason}. Recollection alert created.
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
                  placeholder="Step note (optional)"
                  className="min-w-64 flex-1 rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
                />
                <button
                  onClick={() => advance.mutate()}
                  disabled={advance.isPending}
                  className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                >
                    Advance stage
                </button>
                <button
                  onClick={() => reject.mutate()}
                  disabled={reject.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full border border-wine/30 bg-wine/5 px-4 py-2 text-sm text-wine"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Reject sample
                </button>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-foreground">History (chain of custody)</h4>
              <div className="mt-2 space-y-1.5">
                {(events.data ?? []).map((e: any) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="font-medium text-foreground">
                      {STAGES.find((x) => x.key === e.stage)?.label ?? e.stage}
                      {e.status === "rejected" ? " - REJECTION" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(e.performed_at).toLocaleString("en-US")} - {memberName(e.performed_by)}
                    </span>
                    {e.notes && <span className="w-full text-muted-foreground">{e.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState title="No sample selected" hint="Register a sample to start the 23-stage flow." />
        )}
      </div>
    </div>
  );
}
