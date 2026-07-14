import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";

export const Route = createFileRoute("/app/academy")({ component: Academy });

const modules = [
  { t: "Foundations of elderly care", lvl: "Core", time: "6h", prog: 100, badges: 3 },
  { t: "Dementia & cognitive decline", lvl: "Specialty", time: "8h", prog: 72, badges: 2 },
  { t: "Cardiac event response", lvl: "Critical", time: "4h", prog: 100, badges: 4 },
  { t: "Emotional first aid", lvl: "Wellbeing", time: "3h", prog: 60, badges: 1 },
  { t: "Fall prevention & lifting", lvl: "Mobility", time: "5h", prog: 40, badges: 1 },
  { t: "Care Kranich platform mastery", lvl: "Platform", time: "2h", prog: 100, badges: 2 },
];

const sims = [
  { t: "Cardiac arrest simulation", grade: "A Â· 96", date: "May 10" },
  { t: "Fall scenario Â· bathroom", grade: "A Â· 92", date: "Apr 28" },
  { t: "Difficult family conversation", grade: "B+ Â· 85", date: "Apr 16" },
];

function Academy() {
  return (
    <>
      <PageHeader title="Caregiver academy" subtitle="Microlearning, simulations, certifications â€” continuous mastery." action={<Pill tone="gold">Level 4 Â· Specialist</Pill>} />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Modules completed" value="14 / 22" tone="olive" />
        <Stat label="Certifications" value="6" sub="3 due within 90d" tone="gold" />
        <Stat label="Simulation avg" value="91" sub="grade A" tone="moss" />
        <Stat label="Hours Â· year" value="84h" sub="+ 12h this month" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Learning paths</p>
          <div className="mt-4 space-y-3">
            {modules.map((m) => (
              <div key={m.t} className="rounded-2xl border border-border bg-cream/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{m.t}</p>
                    <p className="text-xs text-muted-foreground">{m.lvl} Â· {m.time} Â· {m.badges} badges</p>
                  </div>
                  <Pill tone={m.prog === 100 ? "moss" : "gold"}>{m.prog === 100 ? "Complete" : `${m.prog}%`}</Pill>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-olive transition-all" style={{ width: `${m.prog}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-gradient-olive text-ivory border-none">
            <p className="text-xs uppercase tracking-widest text-ivory/70">AI training assistant</p>
            <p className="mt-2 font-display text-lg">"Sofia, shall we review fall prevention together? It's the only module under 50%."</p>
            <button className="mt-3 rounded-full bg-ivory px-3 py-1.5 text-xs text-olive">Start 5-min lesson</button>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent simulations</p>
            <ul className="mt-3 space-y-2 text-sm">
              {sims.map((s) => (
                <li key={s.t} className="rounded-xl border border-border/60 bg-cream/40 p-3">
                  <p className="font-medium text-foreground">{s.t}</p>
                  <p className="text-xs text-muted-foreground">{s.date} Â· <span className="text-moss">{s.grade}</span></p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Earned badges</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["First Responder", "Dementia Care", "Family Whisperer", "Night Shift", "Cardiac", "100h Club"].map((b) => (
                <span key={b} className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">â˜… {b}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
