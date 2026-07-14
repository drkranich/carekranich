import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Pill, Ring, EmptyState } from "@/components/app/primitives";
import { ResidentPicker, useResidents, InsightCard, Field, inputCls } from "@/components/app/twin/shared";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cognitive")({ component: CognitivePage });

type Assessment = {
  id: string;
  memory_score: number | null; attention_score: number | null; language_score: number | null;
  reasoning_score: number | null; executive_score: number | null; emotional_stability_score: number | null;
  vitality_score: number | null;
  assessor_role: string; source: string; notes: string | null; assessed_at: string;
};

type Insight = {
  id: string; title: string; summary: string; reasoning: string | null; confidence: number | null;
  severity: string; recommendations: unknown; generated_by: string; created_at: string;
};

type TimelineEvent = {
  id: string; title: string; description: string | null; category: string; severity: string; occurred_at: string;
};

const DIMENSIONS = [
  { key: "memory_score", label: "Memory" },
  { key: "attention_score", label: "Attention" },
  { key: "language_score", label: "Language" },
  { key: "reasoning_score", label: "Reasoning" },
  { key: "executive_score", label: "Executive function" },
  { key: "emotional_stability_score", label: "Emotional stability" },
] as const;

function CognitivePage() {
  const { user, profile, hasAnyRole, primaryRole } = useAuth();
  const qc = useQueryClient();
  const canAssess = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const [residentId, setResidentId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: residents = [] } = useResidents(profile?.tenant_id);
  if (residents.length && !residentId) setResidentId(residents[0].id);

  const { data: assessments = [] } = useQuery({
    queryKey: ["cog-assessments", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cognitive_assessments").select("*")
        .eq("resident_id", residentId).order("assessed_at", { ascending: true });
      return (data ?? []) as Assessment[];
    },
  });

  const { data: insights = [] } = useQuery({
    queryKey: ["cog-insights", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_insights").select("*")
        .eq("resident_id", residentId).eq("module", "cognitive")
        .order("created_at", { ascending: false }).limit(6);
      return (data ?? []) as Insight[];
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["cog-timeline", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("events").select("id,title,description,category,severity,occurred_at")
        .eq("resident_id", residentId)
        .in("category", ["cognitive", "memory", "confusion", "assessment", "twin"])
        .order("occurred_at", { ascending: false }).limit(20);
      return (data ?? []) as TimelineEvent[];
    },
  });

  const latest = assessments[assessments.length - 1];

  const addAssessment = useMutation({
    mutationFn: async (v: Record<string, string>) => {
      const score = (k: string) => v[k] ? Math.max(0, Math.min(100, Number(v[k]))) : null;
      const dims = DIMENSIONS.map((d) => score(d.key)).filter((x): x is number => x != null);
      const vitality = dims.length ? Math.round(dims.reduce((a, b) => a + b, 0) / dims.length) : null;
      const { error } = await supabase.from("cognitive_assessments").insert({
        tenant_id: profile!.tenant_id!,
        resident_id: residentId,
        memory_score: score("memory_score"),
        attention_score: score("attention_score"),
        language_score: score("language_score"),
        reasoning_score: score("reasoning_score"),
        executive_score: score("executive_score"),
        emotional_stability_score: score("emotional_stability_score"),
        vitality_score: vitality,
        assessor_role: primaryRole ?? "caregiver",
        source: v.source ?? "manual",
        notes: v.notes || null,
        created_by: user!.id,
      });
      if (error) throw error;
      await supabase.from("events").insert({
        tenant_id: profile!.tenant_id!,
        resident_id: residentId,
        actor_id: user!.id,
        category: "assessment",
        severity: "info",
        title: "Cognitive assessment",
        description: `Vitality ${vitality ?? "—"} • ${primaryRole ?? "caregiver"}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cog-assessments", residentId] });
      qc.invalidateQueries({ queryKey: ["cog-timeline", residentId] });
      toast.success("Assessment saved");
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!residents.length) {
    return (
      <>
        <PageHeader title="Cognitive Twin" subtitle="Memory, attention, language, reasoning, executive function, emotional stability." />
        <EmptyState title="No residents yet" hint="Add a resident to begin tracking cognition." />
      </>
    );
  }

  const selected = residents.find((r) => r.id === residentId);
  const vitality = latest?.vitality_score ?? 0;

  return (
    <>
      <PageHeader
        title="Cognitive Twin"
        subtitle={selected ? `${selected.preferred_name || selected.full_name} · ${assessments.length} assessments` : ""}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ResidentPicker residents={residents} value={residentId} onChange={setResidentId} />
            {canAssess && (
              <button onClick={() => setShowForm((v) => !v)} className="rounded-full bg-olive px-4 py-2 text-xs text-ivory shadow-soft hover:opacity-90">
                + Assessment
              </button>
            )}
          </div>
        }
      />

      {showForm && canAssess && <AssessmentForm onCancel={() => setShowForm(false)} onSubmit={(v) => addAssessment.mutate(v)} submitting={addAssessment.isPending} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Cognitive vitality</p>
          <div className="mt-4">
            <Ring value={vitality} label="Vitality index" sub={latest ? `as of ${new Date(latest.assessed_at).toLocaleDateString()}` : "no assessments"} color="var(--olive)" size={160} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Dimensions</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {DIMENSIONS.map((d) => {
              const score = latest ? (latest[d.key] as number | null) : null;
              const series = assessments.map((a) => (a[d.key] as number | null) ?? 0);
              const first = series.find((v) => v > 0) ?? 0;
              const last = [...series].reverse().find((v) => v > 0) ?? 0;
              const delta = last - first;
              return (
                <div key={d.key} className="rounded-2xl border border-border bg-cream/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground">{d.label}</p>
                    <span className={`text-xs ${delta > 0 ? "text-moss" : delta < 0 ? "text-wine" : "text-muted-foreground"}`}>
                      {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="font-display text-3xl text-olive">{score ?? "—"}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">/100</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory">
                    <div className="h-full bg-olive transition-all" style={{ width: `${score ?? 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Cognitive timeline</p>
            <Pill tone="moss">live</Pill>
          </div>
          {timeline.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No cognitive events recorded yet. Memory events, confusion episodes, exercises, and assessments will appear here.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {timeline.map((e) => (
                <li key={e.id} className="flex gap-3 border-l-2 border-olive/40 pl-3">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{e.title}</p>
                    {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(e.occurred_at).toLocaleString()} · {e.category}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI cognitive insights</p>
          {insights.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Insights will appear once enough assessments and observations are recorded.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {insights.map((i) => (
                <InsightCard key={i.id} title={i.title} summary={i.summary} reasoning={i.reasoning}
                  confidence={i.confidence} severity={i.severity}
                  recommendations={Array.isArray(i.recommendations) ? (i.recommendations as string[]) : []}
                  generatedBy={i.generated_by} createdAt={i.created_at} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function AssessmentForm({ onCancel, onSubmit, submitting }: {
  onCancel: () => void;
  onSubmit: (v: Record<string, string>) => void;
  submitting: boolean;
}) {
  const [state, setState] = useState<Record<string, string>>({ source: "manual" });
  const upd = (k: string, v: string) => setState((s) => ({ ...s, [k]: v }));
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(state); };
  return (
    <Card className="mb-6">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
        {DIMENSIONS.map((d) => (
          <Field key={d.key} label={`${d.label} (0–100)`}>
            <input className={inputCls()} type="number" min="0" max="100" value={state[d.key] ?? ""} onChange={(e) => upd(d.key, e.target.value)} />
          </Field>
        ))}
        <Field label="Source">
          <select value={state.source} onChange={(e) => upd("source", e.target.value)} className={inputCls()}>
            <option value="manual">Manual</option><option value="caregiver">Caregiver observation</option>
            <option value="nurse">Nurse observation</option><option value="doctor">Doctor assessment</option>
            <option value="assessment">Standardized assessment</option><option value="ai">AI</option>
          </select>
        </Field>
        <div className="md:col-span-3">
          <Field label="Notes"><textarea rows={2} className={inputCls()} value={state.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} placeholder="Observations, context, conditions during assessment…" /></Field>
        </div>
        <div className="md:col-span-3 flex gap-2">
          <button type="submit" disabled={submitting} className="rounded-full bg-olive px-4 py-2 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
            {submitting ? "Saving…" : "Save assessment"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-cream">Cancel</button>
        </div>
      </form>
    </Card>
  );
}
