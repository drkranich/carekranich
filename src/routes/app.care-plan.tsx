import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Ring, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/care-plan")({ component: CarePlan });

const routines = [
  { time: "07:30", task: "Hydration · 250ml water", cat: "Hydration", done: true, owner: "Sofia" },
  { time: "08:00", task: "Breakfast · low-sodium plan", cat: "Nutrition", done: true, owner: "Sofia" },
  { time: "09:00", task: "Blood pressure reading", cat: "Vitals", done: true, owner: "Sofia" },
  { time: "09:15", task: "Metformin 500mg", cat: "Medication", done: true, owner: "Auto-dispenser" },
  { time: "10:30", task: "Cognitive exercise · memory grid", cat: "Cognition", done: true, owner: "Maria" },
  { time: "11:00", task: "Gentle walk · garden · 15 min", cat: "Mobility", done: false, owner: "Sofia" },
  { time: "13:00", task: "Lunch · Mediterranean plan", cat: "Nutrition", done: false, owner: "Sofia" },
  { time: "16:00", task: "Metformin 500mg", cat: "Medication", done: false, owner: "Auto-dispenser" },
  { time: "17:30", task: "Family video call · Inês", cat: "Emotional", done: false, owner: "Maria" },
  { time: "20:00", task: "Evening medication · 3 items", cat: "Medication", done: false, owner: "Sofia" },
  { time: "21:30", task: "Wind-down · breathing", cat: "Wellness", done: false, owner: "Olia AI" },
];

const catTone: Record<string, string> = {
  Hydration: "olive", Nutrition: "moss", Vitals: "wine", Medication: "wine",
  Cognition: "gold", Mobility: "terracotta", Emotional: "wine", Wellness: "moss",
};

function CarePlan() {
  return (
    <>
      <PageHeader
        title="Care plan · Maria Lopes"
        subtitle="Individualized · revised by Dr. Costa on May 02 · co-designed with family"
        action={<div className="flex gap-2"><Pill tone="moss">Adherence 92%</Pill><button className="rounded-full bg-olive px-4 py-2 text-xs text-ivory">Edit plan</button></div>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card><Ring value={92} label="Adherence" sub="Last 7 days" color="var(--olive)" /></Card>
        <Card><Ring value={86} label="Hydration goal" sub="1.6L of 1.8L" color="var(--moss)" /></Card>
        <Card><Ring value={74} label="Cognitive minutes" sub="148 / 200 weekly" color="var(--gold)" /></Card>

        <Card className="lg:col-span-2 p-0">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Today · routine</p>
            <span className="text-xs text-muted-foreground">5 of 11 complete</span>
          </div>
          <ul className="divide-y divide-border/60">
            {routines.map((r) => (
              <li key={r.time} className="flex items-center gap-4 px-6 py-3">
                <span className="w-14 font-display text-sm text-muted-foreground tabular-nums">{r.time}</span>
                <button className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 ${r.done ? "bg-olive border-olive text-ivory" : "border-border bg-card"}`}>
                  {r.done && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7"/></svg>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${r.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{r.task}</p>
                  <p className="text-xs text-muted-foreground">{r.owner}</p>
                </div>
                <Pill tone={catTone[r.cat] as any}>{r.cat}</Pill>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Active protocols</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { n: "Cardiac stability — Tier 2", t: "wine" },
                { n: "Diabetes type II — managed", t: "gold" },
                { n: "Cognitive maintenance plan", t: "moss" },
                { n: "Mobility — gentle restoration", t: "terracotta" },
              ].map((p) => (
                <li key={p.n} className="flex items-center justify-between rounded-xl border border-border/60 bg-cream/40 p-3">
                  <span className="text-foreground">{p.n}</span>
                  <Pill tone={p.t as any}>Active</Pill>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="bg-gradient-olive text-ivory border-none">
            <p className="text-xs uppercase tracking-widest text-ivory/70">AI optimization</p>
            <p className="mt-2 text-sm text-ivory/90">Shifting the cognitive exercise to 10:30 increased completion by 18%. Consider moving the evening walk to 18:00 — earlier light correlates with calmer sleep.</p>
            <button className="mt-3 rounded-full bg-ivory px-3 py-1.5 text-xs text-olive">Apply suggestion</button>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Care team</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { n: "Sofia Mendes", r: "Lead caregiver", t: "terracotta" },
                { n: "Dr. Joana Costa", r: "Cardiologist", t: "wine" },
                { n: "Inês Ribeiro", r: "Family · daughter", t: "olive" },
                { n: "Olia Companion", r: "AI assistant", t: "gold" },
              ].map((m) => (
                <li key={m.n} className="flex items-center gap-3">
                  <Avatar name={m.n} tone={m.t} size={32} />
                  <div className="min-w-0"><p className="text-foreground truncate">{m.n}</p><p className="text-xs text-muted-foreground">{m.r}</p></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
