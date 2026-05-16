import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Stat, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/alerts")({ component: Alerts });

const alerts = [
  { sev: "Critical", tone: "wine", title: "Fall detected · living room", patient: "Maria Lopes", cat: "Emergency", time: "now", ack: false, esc: "Caregiver · Family · 112" },
  { sev: "High", tone: "terracotta", title: "BP 168/102 — sustained 12 min", patient: "João Santos", cat: "Health", time: "3 min", ack: false, esc: "Telemed Dr. Costa" },
  { sev: "High", tone: "terracotta", title: "Emotional withdrawal pattern (3d)", patient: "Ana Cruz", cat: "Emotional", time: "12 min", ack: true, esc: "Family + Coach" },
  { sev: "Med", tone: "gold", title: "Medication missed · Metformin 16:00", patient: "Maria Lopes", cat: "Medication", time: "24 min", ack: false, esc: "Caregiver Sofia" },
  { sev: "Med", tone: "gold", title: "Hydration trend low — 2 days", patient: "P. Almeida", cat: "AI Predictive", time: "1h", ack: true, esc: "Caregiver" },
  { sev: "Low", tone: "moss", title: "Stove guard armed", patient: "Maria Lopes", cat: "Environmental", time: "2h", ack: true, esc: "—" },
  { sev: "Low", tone: "moss", title: "Caregiver clocked out", patient: "Shift #248", cat: "Operational", time: "3h", ack: true, esc: "—" },
];

function Alerts() {
  return (
    <>
      <PageHeader
        title="Alert intelligence"
        subtitle="Prioritized, deduplicated, escalation-aware. Acknowledgment required."
        action={<Pill tone="wine">2 critical unacknowledged</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Critical" value="2" sub="< 60s SLA" tone="wine" />
        <Stat label="High" value="5" sub="< 5min SLA" tone="terracotta" />
        <Stat label="Medium" value="11" sub="< 30min" tone="gold" />
        <Stat label="Low / info" value="34" sub="suppressed dupes: 47" tone="moss" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Categories</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {["All alerts", "Health", "Emotional", "Behavioral", "Medication", "Environmental", "Smart home", "Operational", "AI predictive"].map((c, i) => (
              <li key={c} className={`flex items-center justify-between rounded-xl px-3 py-2 ${i === 0 ? "bg-olive text-ivory" : "text-foreground/70 hover:bg-cream"}`}>
                <span>{c}</span>
                <span className="text-xs opacity-70">{[52, 8, 4, 3, 6, 9, 12, 7, 3][i]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-2xl border border-border bg-cream/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Smart suppression</p>
            <p className="mt-1 text-xs text-foreground">47 duplicate signals collapsed in the last hour by Olia AI.</p>
          </div>
        </Card>

        <Card className="lg:col-span-3 p-0">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Live alert stream</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-2 w-2 animate-pulse-soft rounded-full bg-moss"/> WebSocket connected
            </div>
          </div>
          <ul className="divide-y divide-border/60">
            {alerts.map((a, i) => (
              <li key={i} className="px-6 py-4 hover:bg-cream/40">
                <div className="flex items-start gap-4">
                  <Pill tone={a.tone as any}>{a.sev}</Pill>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <span className="text-xs text-muted-foreground">· {a.patient}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.cat} · escalation → {a.esc} · {a.time} ago</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {a.ack ? <Pill tone="moss">Acknowledged</Pill> : <button className="rounded-full bg-olive px-3 py-1 text-xs text-ivory">Acknowledge</button>}
                    <button className="text-[11px] text-muted-foreground hover:text-wine">Escalate ↗</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Escalation ladder · template</p>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {[
              { t: 1, who: "Primary caregiver", w: "0s", icon: "wine" },
              { t: 2, who: "Backup caregiver", w: "+30s", icon: "terracotta" },
              { t: 3, who: "Family contact", w: "+60s", icon: "gold" },
              { t: 4, who: "Telemedicine MD", w: "+90s", icon: "olive" },
              { t: 5, who: "Emergency services", w: "+120s", icon: "wine" },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-border bg-cream/40 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tier {s.t} · {s.w}</p>
                <p className="mt-2 text-sm text-foreground">{s.who}</p>
                <Pill tone={s.icon as any}>auto</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
