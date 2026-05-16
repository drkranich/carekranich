import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Stat, Avatar, Spark, Bars } from "@/components/app/primitives";

export const Route = createFileRoute("/app/command")({ component: Command });

function Command() {
  return (
    <>
      <PageHeader
        title="Operations command center"
        subtitle="Live mission control · 14 organizations · 1,284 residents · 312 caregivers on shift"
        action={<div className="flex items-center gap-2"><Pill tone="moss">● Live</Pill><Pill tone="gold">3 active incidents</Pill></div>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="On shift" value="312" sub="↑ 4 vs forecast" tone="olive" />
        <Stat label="Active alerts" value="17" sub="3 critical · 14 soft" tone="wine" />
        <Stat label="Avg response" value="48s" sub="SLA 90s" tone="moss" />
        <Stat label="System health" value="99.98%" sub="All regions nominal" tone="gold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Live operations map · Iberia</p>
              <h3 className="mt-1 font-display text-xl">Caregiver distribution & active incidents</h3>
            </div>
            <Pill tone="moss">Realtime · WebSocket</Pill>
          </div>
          <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-br from-cream via-ivory to-sage/20 border border-border">
            <svg viewBox="0 0 400 225" className="absolute inset-0 h-full w-full">
              <path d="M80 40 L120 30 L160 50 L200 45 L240 70 L280 60 L320 90 L300 140 L260 170 L200 180 L140 170 L100 140 L70 100 Z" fill="var(--sage)" opacity="0.25" stroke="var(--olive)" strokeWidth="1"/>
              {[
                { x: 130, y: 90, label: "Lisboa", n: 84, critical: true },
                { x: 180, y: 60, label: "Porto", n: 52 },
                { x: 240, y: 110, label: "Madrid", n: 118, critical: true },
                { x: 290, y: 150, label: "Valencia", n: 31 },
                { x: 160, y: 150, label: "Sevilla", n: 27, critical: true },
              ].map((c) => (
                <g key={c.label}>
                  {c.critical && <circle cx={c.x} cy={c.y} r="14" fill="var(--wine)" opacity="0.18"><animate attributeName="r" values="10;20;10" dur="2.4s" repeatCount="indefinite"/></circle>}
                  <circle cx={c.x} cy={c.y} r="5" fill={c.critical ? "var(--wine)" : "var(--olive)"} />
                  <text x={c.x + 9} y={c.y + 4} fontSize="9" fill="var(--foreground)" className="font-medium">{c.label} · {c.n}</text>
                </g>
              ))}
            </svg>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-border bg-cream/40 p-3"><p className="text-muted-foreground">Active shifts</p><p className="mt-1 font-display text-lg">312</p></div>
            <div className="rounded-xl border border-border bg-cream/40 p-3"><p className="text-muted-foreground">Unstaffed regions</p><p className="mt-1 font-display text-lg text-wine">2</p></div>
            <div className="rounded-xl border border-border bg-cream/40 p-3"><p className="text-muted-foreground">Surge requests</p><p className="mt-1 font-display text-lg text-gold">5</p></div>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Active incidents</p>
          <ul className="mt-4 space-y-3">
            {[
              { t: "Fall detected", r: "Madrid · M. Alves", lvl: "Critical", tone: "wine", time: "0:42" },
              { t: "BP spike", r: "Lisboa · J. Santos", lvl: "High", tone: "terracotta", time: "2:18" },
              { t: "Missed medication", r: "Sevilla · A. Cruz", lvl: "Med", tone: "gold", time: "4:05" },
              { t: "Caregiver late", r: "Porto · shift 14:00", lvl: "Low", tone: "moss", time: "8:22" },
            ].map((i) => (
              <li key={i.t} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground">{i.t}</p>
                  <Pill tone={i.tone as any}>{i.lvl}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{i.r} · open {i.time}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI risk heatmap · next 48h</p>
          <div className="mt-4 grid grid-cols-12 gap-1">
            {Array.from({ length: 96 }).map((_, i) => {
              const r = Math.sin(i * 0.7) * 0.5 + 0.5;
              const color = r > 0.75 ? "var(--wine)" : r > 0.5 ? "var(--terracotta)" : r > 0.25 ? "var(--gold)" : "var(--moss)";
              return <div key={i} className="aspect-square rounded-sm" style={{ background: color, opacity: 0.25 + r * 0.6 }} />;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Now</span><span>+24h</span><span>+48h</span>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Response time · 24h</p>
          <Spark points={[48, 52, 41, 38, 44, 36, 42, 39, 35, 33, 40, 37]} color="var(--olive)" height={60} />
          <p className="mt-2 text-xs text-muted-foreground">Avg <span className="font-display text-foreground">48s</span> · best <span className="font-display text-moss">22s</span></p>
        </Card>
      </div>
    </>
  );
}
