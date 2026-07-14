import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Pill, Ring, EmptyState } from "@/components/app/primitives";
import { ResidentPicker, useResidents, InsightCard } from "@/components/app/twin/shared";
import { toast } from "sonner";

export const Route = createFileRoute("/app/longevity")({ component: LongevityPage });

type Score = {
  id: string;
  longevity_score: number | null;
  resilience_score: number | null;
  health_score: number | null;
  mobility_score: number | null;
  cognitive_score: number | null;
  emotional_score: number | null;
  social_score: number | null;
  risk_factors: unknown;
  protective_factors: unknown;
  methodology: unknown;
  computed_at: string;
};

type Insight = {
  id: string;
  title: string;
  summary: string;
  reasoning: string | null;
  confidence: number | null;
  severity: string;
  recommendations: unknown;
  generated_by: string;
  created_at: string;
};

type Obs = { domain: string; value_numeric: number | null; observed_at: string };
type Assess = {
  vitality_score: number | null;
  emotional_stability_score: number | null;
  assessed_at: string;
};

function LongevityPage() {
  const { user, profile, hasAnyRole } = useAuth();
  const qc = useQueryClient();
  const canCompute = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const [residentId, setResidentId] = useState("");

  const { data: residents = [] } = useResidents(profile?.tenant_id);

  useEffect(() => {
    if (residents.length && !residentId) setResidentId(residents[0].id);
  }, [residentId, residents]);

  const { data: scores = [] } = useQuery({
    queryKey: ["long-scores", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("longevity_scores")
        .select("*")
        .eq("resident_id", residentId)
        .order("computed_at", { ascending: true });
      return (data ?? []) as Score[];
    },
  });

  const { data: insights = [] } = useQuery({
    queryKey: ["long-insights", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("resident_id", residentId)
        .eq("module", "longevity")
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []) as Insight[];
    },
  });

  const { data: obs = [] } = useQuery({
    queryKey: ["long-obs", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("twin_observations")
        .select("domain,value_numeric,observed_at")
        .eq("resident_id", residentId)
        .gte("observed_at", since.toISOString());
      return (data ?? []) as Obs[];
    },
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["long-cog", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cognitive_assessments")
        .select("vitality_score,emotional_stability_score,assessed_at")
        .eq("resident_id", residentId)
        .order("assessed_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Assess[];
    },
  });

  const latest = scores[scores.length - 1];

  const compute = useMutation({
    mutationFn: async () => {
      const sub = computeScores(obs, assessments);
      const longevity = Math.round(
        (sub.health + sub.resilience + sub.mobility + sub.cognitive + sub.emotional + sub.social) /
          6,
      );
      const risk: string[] = [];
      const protect: string[] = [];
      if (sub.hydrationCount < 3) risk.push("Low hydration logging cadence");
      if (sub.social < 50) risk.push("Limited social engagement");
      if (sub.mobility < 50) risk.push("Reduced mobility activity");
      if (sub.cognitive >= 75) protect.push("Strong cognitive baseline");
      if (sub.emotional >= 70) protect.push("Stable emotional profile");
      if (sub.health >= 70) protect.push("Consistent health observations");

      const { error } = await supabase.from("longevity_scores").insert({
        tenant_id: profile!.tenant_id!,
        resident_id: residentId,
        longevity_score: longevity,
        resilience_score: sub.resilience,
        health_score: sub.health,
        mobility_score: sub.mobility,
        cognitive_score: sub.cognitive,
        emotional_score: sub.emotional,
        social_score: sub.social,
        risk_factors: risk,
        protective_factors: protect,
        methodology: { version: "v1", window_days: 30, inputs: sub.counts },
      });
      if (error) throw error;
      await supabase.from("events").insert({
        tenant_id: profile!.tenant_id!,
        resident_id: residentId,
        actor_id: user!.id,
        category: "longevity",
        severity: "info",
        title: "Longevity score recomputed",
        description: `Longevity ${longevity} - Resilience ${sub.resilience}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["long-scores", residentId] });
      toast.success("Scores recomputed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!residents.length) {
    return (
      <>
        <PageHeader
          title="Longevity Engine"
          subtitle="A premium longevity intelligence system for every resident."
        />
        <EmptyState title="No residents yet" hint="Add a resident to begin." />
      </>
    );
  }

  const selected = residents.find((r) => r.id === residentId);
  const dims = [
    { key: "health_score", label: "Health" },
    { key: "resilience_score", label: "Resilience" },
    { key: "mobility_score", label: "Mobility" },
    { key: "cognitive_score", label: "Cognitive" },
    { key: "emotional_score", label: "Emotional" },
    { key: "social_score", label: "Social engagement" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Longevity Engine"
        subtitle={
          selected
            ? `${selected.preferred_name || selected.full_name} - ${scores.length} score snapshots`
            : ""
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ResidentPicker residents={residents} value={residentId} onChange={setResidentId} />
            {canCompute && (
              <button
                onClick={() => compute.mutate()}
                disabled={compute.isPending}
                className="rounded-full bg-olive px-4 py-2 text-xs text-ivory shadow-soft hover:opacity-90 disabled:opacity-50"
              >
                {compute.isPending ? "Computing..." : "Recompute scores"}
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-gradient-olive text-ivory border-none" padded>
          <p className="text-xs uppercase text-ivory/70">Current longevity score</p>
          <div className="mt-4 flex items-end gap-6">
            <p className="font-display text-7xl">{latest?.longevity_score ?? "-"}</p>
            <div>
              <p className="text-xs text-ivory/70">Trajectory</p>
              <p className="text-xl font-semibold">{trajectoryLabel(scores)}</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm text-ivory/80">
            Computed from a 30-day rolling window over health, cognitive, emotional, mobility, and
            social signals captured by the Digital Twin.
          </p>
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Resilience</p>
          <div className="mt-4">
            <Ring
              value={latest?.resilience_score ?? 0}
              label="Resilience index"
              sub="adaptive capacity"
              color="var(--wine)"
              size={150}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {dims.map((d) => {
          const v = latest ? (latest[d.key] as number | null) : null;
          return (
            <Card key={d.key}>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{d.label}</p>
              <p className="mt-2 text-3xl font-semibold text-olive">{v ?? "-"}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream">
                <div className="h-full bg-olive transition-all" style={{ width: `${v ?? 0}%` }} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Risk factors</p>
          {latest &&
          Array.isArray(latest.risk_factors) &&
          (latest.risk_factors as string[]).length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {(latest.risk_factors as string[]).map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-wine">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-wine" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">None identified.</p>
          )}
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Protective factors</p>
          {latest &&
          Array.isArray(latest.protective_factors) &&
          (latest.protective_factors as string[]).length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {(latest.protective_factors as string[]).map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-moss">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-moss" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Recompute to surface protective signals.
            </p>
          )}
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Areas for improvement</p>
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {latest ? (
              dims
                .map((d) => ({ label: d.label, v: (latest[d.key] as number | null) ?? 0 }))
                .sort((a, b) => a.v - b.v)
                .slice(0, 3)
                .map((x) => (
                  <li key={x.label} className="flex items-center justify-between">
                    <span>{x.label}</span>
                    <Pill tone="gold">{x.v}</Pill>
                  </li>
                ))
            ) : (
              <li className="text-muted-foreground">No scores yet.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">AI recommendations</h2>
        {insights.length === 0 ? (
          <EmptyState
            title="No AI recommendations yet"
            hint="Recompute scores to enable AI synthesis, or wait for the insight system to populate."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((i) => (
              <InsightCard
                key={i.id}
                title={i.title}
                summary={i.summary}
                reasoning={i.reasoning}
                confidence={i.confidence}
                severity={i.severity}
                recommendations={
                  Array.isArray(i.recommendations) ? (i.recommendations as string[]) : []
                }
                generatedBy={i.generated_by}
                createdAt={i.created_at}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Longevity journey</h2>
        <Card>
          {scores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No journey yet - milestones and score evolution will populate after the first
              recompute.
            </p>
          ) : (
            <ol className="space-y-4">
              {scores
                .slice()
                .reverse()
                .map((s, i) => (
                  <li key={s.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-olive text-ivory font-display text-sm">
                        {scores.length - i}
                      </div>
                      {i < scores.length - 1 && <div className="my-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 rounded-2xl border border-border bg-cream/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">Score snapshot</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.computed_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-2xl font-semibold text-olive">
                        Longevity {s.longevity_score ?? "-"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <Pill tone="moss">Resilience {s.resilience_score ?? "-"}</Pill>
                        <Pill tone="olive">Cognitive {s.cognitive_score ?? "-"}</Pill>
                        <Pill tone="terracotta">Emotional {s.emotional_score ?? "-"}</Pill>
                        <Pill tone="gold">Social {s.social_score ?? "-"}</Pill>
                      </div>
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

function trajectoryLabel(scores: Score[]) {
  if (scores.length < 2) return "-";
  const first = scores[0].longevity_score ?? 0;
  const last = scores[scores.length - 1].longevity_score ?? 0;
  const d = last - first;
  if (d > 2) return `Improving (+${d})`;
  if (d < -2) return `Declining (${d})`;
  return "Stable";
}

function computeScores(obs: Obs[], assessments: Assess[]) {
  const byDomain: Record<string, number[]> = {};
  for (const o of obs)
    if (o.value_numeric != null) (byDomain[o.domain] ||= []).push(o.value_numeric);
  const cnt = (k: string) => (byDomain[k] ?? []).length;

  // count-driven baseline (cadence proxy)
  const cadence = (k: string) => Math.min(100, cnt(k) * 8);

  const health = Math.round((cadence("health") + cadence("hydration") + cadence("medication")) / 3);
  const mobility = cadence("mobility");
  const social = cadence("social");
  const emotional =
    assessments[0]?.emotional_stability_score ??
    Math.round((cadence("emotional") + (assessments[0]?.vitality_score ?? 0)) / 2);
  const cognitive = assessments[0]?.vitality_score ?? cadence("cognitive");
  const resilience = Math.round((emotional + cognitive + mobility) / 3);

  return {
    health,
    mobility,
    social,
    emotional,
    cognitive,
    resilience,
    hydrationCount: cnt("hydration"),
    counts: Object.fromEntries(Object.entries(byDomain).map(([k, v]) => [k, v.length])),
  };
}
