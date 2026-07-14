import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Pill, EmptyState } from "@/components/app/primitives";
import {
  ResidentPicker,
  StatusTile,
  InsightCard,
  useResidents,
  Field,
  inputCls,
} from "@/components/app/twin/shared";
import { GlassSelect } from "@/components/app/GlassSelect";
import { toast } from "sonner";

export const Route = createFileRoute("/app/twin")({ component: TwinPage });

type Obs = {
  id: string;
  domain: string;
  metric: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  source: string;
  confidence: number | null;
  notes: string | null;
  observed_at: string;
};

type Insight = {
  id: string;
  module: string;
  title: string;
  summary: string;
  reasoning: string | null;
  confidence: number | null;
  severity: string;
  recommendations: unknown;
  generated_by: string;
  created_at: string;
};

const DOMAINS: {
  key: string;
  label: string;
  tone: "olive" | "wine" | "moss" | "terracotta" | "gold";
  icon: string;
  unit?: string;
}[] = [
  {
    key: "health",
    label: "Health",
    tone: "wine",
    icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67 10.94 4.61a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
  },
  {
    key: "emotional",
    label: "Emotional",
    tone: "terracotta",
    icon: "M14 9V5a3 3 0 0 0-6 0v4 M5 9h14l-1 12H6L5 9z",
    unit: "/10",
  },
  {
    key: "cognitive",
    label: "Cognitive",
    tone: "olive",
    icon: "M12 2a5 5 0 0 0-5 5v1a4 4 0 0 0-2 7 4 4 0 0 0 7 3 4 4 0 0 0 7-3 4 4 0 0 0-2-7V7a5 5 0 0 0-5-5z",
    unit: "/100",
  },
  {
    key: "mobility",
    label: "Mobility",
    tone: "moss",
    icon: "M13 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M5 21l4-7 4 4 5-9",
    unit: "steps",
  },
  {
    key: "hydration",
    label: "Hydration",
    tone: "olive",
    icon: "M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13z",
    unit: "ml",
  },
  { key: "sleep", label: "Sleep", tone: "wine", icon: "M21 12.79A9 9 0 1 1 11.21 3", unit: "h" },
  {
    key: "medication",
    label: "Medication",
    tone: "gold",
    icon: "M9 12h6 M12 9v6 M10.5 2h3l7 7v6l-7 7h-3l-7-7v-6z",
    unit: "%",
  },
  {
    key: "social",
    label: "Social",
    tone: "terracotta",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M16 3.13a4 4 0 0 1 0 7.75 M23 21v-2a4 4 0 0 0-3-3.87",
    unit: "events",
  },
];
const EXTRA_DOMAIN_OPTIONS = [
  { value: "environment", label: "Ambiente" },
  { value: "routine", label: "Rotina" },
  { value: "behavior", label: "Comportamento" },
];
const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "caregiver", label: "Cuidador" },
  { value: "nurse", label: "Enfermagem" },
  { value: "doctor", label: "Medico" },
  { value: "device", label: "Dispositivo" },
  { value: "family", label: "Familia" },
];

function TwinPage() {
  const { user, profile, hasAnyRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canContribute = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const canManage = hasAnyRole(["clinic_admin", "super_admin"]);

  const [residentId, setResidentId] = useState("");
  const [window, setWindow] = useState<7 | 30 | 90 | 365>(30);
  const [showForm, setShowForm] = useState(false);

  const { data: residents = [] } = useResidents(profile?.tenant_id, isSuperAdmin);

  useEffect(() => {
    if (residents.length && !residentId) setResidentId(residents[0].id);
  }, [residentId, residents]);

  const sinceISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - window);
    return d.toISOString();
  }, [window]);

  const { data: observations = [] } = useQuery({
    queryKey: ["twin-obs", residentId, sinceISO],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("twin_observations")
        .select("*")
        .eq("resident_id", residentId)
        .gte("observed_at", sinceISO)
        .order("observed_at", { ascending: true });
      return (data ?? []) as Obs[];
    },
  });

  const { data: insights = [] } = useQuery({
    queryKey: ["twin-insights", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("resident_id", residentId)
        .in("module", ["digital_twin", "behavior", "health_trajectory"])
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as Insight[];
    },
  });

  // group by domain
  const byDomain = useMemo(() => {
    const map: Record<string, Obs[]> = {};
    for (const o of observations) (map[o.domain] ||= []).push(o);
    return map;
  }, [observations]);

  const addObs = useMutation({
    mutationFn: async (v: {
      domain: string;
      metric: string;
      value_numeric: string;
      value_text: string;
      unit: string;
      notes: string;
      source: string;
    }) => {
      const tenantId = profile?.tenant_id ?? residents.find((resident) => resident.id === residentId)?.tenant_id;
      if (!tenantId) throw new Error("Select a resident with an organization before recording an observation.");
      const { error } = await supabase.from("twin_observations").insert({
        tenant_id: tenantId,
        resident_id: residentId,
        domain: v.domain,
        metric: v.metric,
        value_numeric: v.value_numeric ? Number(v.value_numeric) : null,
        value_text: v.value_text || null,
        unit: v.unit || null,
        notes: v.notes || null,
        source: v.source,
        created_by: user!.id,
      });
      if (error) throw error;

      // also log to timeline
      await supabase.from("events").insert({
        tenant_id: tenantId,
        resident_id: residentId,
        actor_id: user!.id,
        category: "twin",
        severity: "info",
        title: `${v.domain} observation`,
        description: `${v.metric}${v.value_numeric ? `: ${v.value_numeric}${v.unit || ""}` : v.value_text ? `: ${v.value_text}` : ""}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["twin-obs", residentId] });
      setShowForm(false);
      toast.success("Observation recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!residents.length) {
    return (
      <>
        <PageHeader title="Digital Twin" subtitle="A living representation of every resident." />
        <EmptyState
          title="No residents yet"
          hint="Add a resident to begin building their Digital Twin."
        />
      </>
    );
  }

  const selected = residents.find((r) => r.id === residentId);
  const stabilityScore = computeStability(observations);

  return (
    <>
      <PageHeader
        title="Digital Twin"
        subtitle={
          selected
            ? `Living representation of ${selected.preferred_name || selected.full_name}`
            : ""
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ResidentPicker residents={residents} value={residentId} onChange={setResidentId} />
            <div className="flex rounded-full border border-border bg-ivory p-1 text-xs">
              {[7, 30, 90, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setWindow(d as 7 | 30 | 90 | 365)}
                  className={`rounded-full px-3 py-1 ${window === d ? "bg-olive text-ivory" : "text-muted-foreground hover:text-olive"}`}
                >
                  {d === 365 ? "1y" : `${d}d`}
                </button>
              ))}
            </div>
            {canContribute && (
              <button
                onClick={() => setShowForm((v) => !v)}
                className="rounded-full bg-olive px-4 py-2 text-xs text-ivory shadow-soft hover:opacity-90"
              >
                + Observation
              </button>
            )}
          </div>
        }
      />

      {showForm && canContribute && (
        <ObsForm
          onCancel={() => setShowForm(false)}
          onSubmit={(v) => addObs.mutate(v)}
          submitting={addObs.isPending}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {DOMAINS.map((d) => {
          const obs = byDomain[d.key] ?? [];
          const last = obs[obs.length - 1];
          const prev = obs[obs.length - 2];
          const values = obs.map((o) => o.value_numeric ?? 0).filter((v) => v > 0);
          const trend =
            last && prev && last.value_numeric != null && prev.value_numeric != null
              ? last.value_numeric > prev.value_numeric
                ? "up"
                : last.value_numeric < prev.value_numeric
                  ? "down"
                  : "flat"
              : "flat";
          const status = obs.length === 0 ? "no data" : `${obs.length} observations`;
          const value =
            last?.value_numeric != null
              ? `${last.value_numeric}${last.unit || d.unit || ""}`
              : (last?.value_text ?? undefined);
          return (
            <StatusTile
              key={d.key}
              label={d.label}
              status={status}
              value={value}
              trend={trend}
              spark={values}
              tone={d.tone}
              icon={d.icon}
            />
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Health trajectory</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {window === 7
                  ? "Last 7 days"
                  : window === 30
                    ? "Last 30 days"
                    : window === 90
                      ? "Last 90 days"
                      : "Last year"}
              </p>
            </div>
            <Pill tone="moss">{observations.length} observations</Pill>
          </div>
          <Trajectory observations={observations} window={window} />
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Behavior stability</p>
          <p className="mt-2 font-display text-5xl text-olive">{stabilityScore}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            based on routine adherence, social interaction frequency, and observation cadence over
            the selected window
          </p>
          <div className="mt-4 space-y-2">
            <BehaviorRow label="Social interaction" value={byDomain.social?.length ?? 0} />
            <BehaviorRow
              label="Routine adherence"
              value={Math.min(100, Math.round(((byDomain.routine?.length ?? 0) / window) * 100))}
              suffix="%"
            />
            <BehaviorRow
              label="Mood stability"
              value={moodVariance(byDomain.emotional ?? [])}
              suffix="Ïƒ"
            />
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">AI observations</h2>
          {canManage && <Pill tone="muted">admin-managed</Pill>}
        </div>
        {insights.length === 0 ? (
          <EmptyState
            title="No AI insights yet"
            hint="Once enough observations are recorded, the AI insight system will surface patterns here."
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
    </>
  );
}

function ObsForm({
  onCancel,
  onSubmit,
  submitting,
}: {
  onCancel: () => void;
  onSubmit: (v: {
    domain: string;
    metric: string;
    value_numeric: string;
    value_text: string;
    unit: string;
    notes: string;
    source: string;
  }) => void;
  submitting: boolean;
}) {
  const [domain, setDomain] = useState("health");
  const [metric, setMetric] = useState("");
  const [vNum, setVNum] = useState("");
  const [vTxt, setVTxt] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("manual");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!metric) return;
    onSubmit({ domain, metric, value_numeric: vNum, value_text: vTxt, unit, notes, source });
  };
  return (
    <Card className="mb-6">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
        <Field label="Domain">
          <GlassSelect
            value={domain}
            onChange={setDomain}
            options={[
              ...DOMAINS.map((d) => ({ value: d.key, label: d.label })),
              ...EXTRA_DOMAIN_OPTIONS,
            ]}
          />
        </Field>
        <Field label="Metric">
          <input
            className={inputCls()}
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder="e.g. resting heart rate"
            required
          />
        </Field>
        <Field label="Source">
          <GlassSelect value={source} onChange={setSource} options={SOURCE_OPTIONS} />
        </Field>
        <Field label="Value (numeric)">
          <input
            className={inputCls()}
            type="number"
            step="0.01"
            value={vNum}
            onChange={(e) => setVNum(e.target.value)}
          />
        </Field>
        <Field label="Unit">
          <input
            className={inputCls()}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="bpm, ml, h..."
          />
        </Field>
        <Field label="Value (text)">
          <input
            className={inputCls()}
            value={vTxt}
            onChange={(e) => setVTxt(e.target.value)}
            placeholder="alert, calm, agitated..."
          />
        </Field>
        <div className="md:col-span-3">
          <Field label="Notes">
            <textarea
              className={inputCls()}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
        <div className="md:col-span-3 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-olive px-4 py-2 text-sm text-ivory hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save observation"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-cream"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function Trajectory({ observations, window }: { observations: Obs[]; window: number }) {
  // build per-domain sparkline series
  const series = DOMAINS.map((d) => {
    const pts = observations
      .filter((o) => o.domain === d.key && o.value_numeric != null)
      .map((o) => o.value_numeric as number);
    return { key: d.key, label: d.label, tone: d.tone, pts };
  }).filter((s) => s.pts.length > 1);
  if (series.length === 0)
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Not enough data to draw a trajectory. Record observations to build the trend.
      </p>
    );
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {series.map((s) => {
        const first = s.pts[0];
        const last = s.pts[s.pts.length - 1];
        const delta = last - first;
        return (
          <div key={s.key} className="rounded-2xl border border-border bg-cream/40 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{s.label}</span>
              <span className={delta > 0 ? "text-moss" : delta < 0 ? "text-wine" : ""}>
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}
              </span>
            </div>
            <Sparkline pts={s.pts} />
          </div>
        );
      })}
      <p className="md:col-span-2 mt-2 text-xs text-muted-foreground">
        Window: {window === 365 ? "1 year" : `${window} days`}. AI summary panel will populate once
        observations cross the analysis threshold.
      </p>
    </div>
  );
}

function Sparkline({ pts }: { pts: number[] }) {
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const r = max - min || 1;
  const w = 200;
  const h = 40;
  const step = w / (pts.length - 1);
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((p - min) / r) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-10 w-full">
      <path d={path} fill="none" stroke="var(--olive)" strokeWidth="1.5" />
    </svg>
  );
}

function BehaviorRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display text-foreground">
        {value}
        {suffix}
      </span>
    </div>
  );
}

function computeStability(observations: Obs[]) {
  if (observations.length === 0) return 0;
  const domains = new Set(observations.map((o) => o.domain));
  const cadence = Math.min(40, observations.length);
  const breadth = domains.size * 7;
  return Math.min(99, cadence + breadth);
}

function moodVariance(obs: Obs[]) {
  const vals = obs.map((o) => o.value_numeric).filter((v): v is number => v != null);
  if (vals.length < 2) return "-";
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const v = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
  return v.toFixed(2);
}
