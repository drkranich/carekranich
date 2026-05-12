import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Ring, Stat } from "@/components/app/primitives";

export const Route = createFileRoute("/app/longevity")({
  component: Longevity,
});

function Longevity() {
  return (
    <>
      <PageHeader title="Longevity & wellbeing" subtitle="Personalised plans for movement, mind, sleep and nourishment." action={<Pill tone="wine">Healthspan +4.2y projected</Pill>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-gradient-olive text-ivory border-none" padded>
          <p className="text-xs uppercase tracking-widest text-ivory/70">This week's journey</p>
          <h2 className="mt-2 font-display text-3xl">Gentle Strength</h2>
          <p className="mt-3 max-w-md text-sm text-ivory/80">A 7-day journey of light resistance, mindful breathing and Mediterranean nourishment — designed by Dr. Costa for cardiovascular vitality.</p>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div><p className="text-xs text-ivory/60">Day</p><p className="font-display text-2xl">3 of 7</p></div>
            <div className="h-10 w-px bg-ivory/20"/>
            <div><p className="text-xs text-ivory/60">Adherence</p><p className="font-display text-2xl">100%</p></div>
            <div className="h-10 w-px bg-ivory/20"/>
            <div><p className="text-xs text-ivory/60">Streak</p><p className="font-display text-2xl">12 days</p></div>
          </div>
          <button className="mt-6 rounded-full bg-ivory px-5 py-2.5 text-sm text-olive hover:opacity-90">Continue today</button>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Longevity score</p>
          <div className="mt-4">
            <Ring value={87} label="Healthspan index" sub="▲ 6 this month" color="var(--wine)" size={150} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-cream/60 p-3"><p className="text-muted-foreground">Bio age</p><p className="font-display text-lg text-olive">73</p></div>
            <div className="rounded-xl bg-cream/60 p-3"><p className="text-muted-foreground">Calendar age</p><p className="font-display text-lg text-foreground">82</p></div>
          </div>
        </Card>

        {[
          { c: "Movement", t: "Senior strength · 12 min", desc: "Chair-supported routine focused on grip, hips and balance.", icon: "M13 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M5 21l4-7 4 4 5-9", tone: "olive" },
          { c: "Mind", t: "Memory cards · 8 min", desc: "Spatial memory exercises tuned to Maria's cognitive profile.", icon: "M9 11H5a2 2 0 0 0-2 2v7h6 M15 11h4a2 2 0 0 1 2 2v7h-6", tone: "wine" },
          { c: "Breath", t: "4-7-8 calming breath", desc: "5-minute parasympathetic reset before bed.", icon: "M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z", tone: "moss" },
          { c: "Sleep", t: "Wind-down ritual", desc: "Light, sound and temperature tuned for deep sleep at 22:30.", icon: "M21 12.79A9 9 0 1 1 11.21 3", tone: "gold" },
          { c: "Nourish", t: "Mediterranean lunch", desc: "Grilled fish, olive-oil greens, lentils — anti-inflammatory profile.", icon: "M3 12h18 M12 3v18", tone: "terracotta" },
          { c: "Connect", t: "Tea with Helena", desc: "Scheduled Thursday — proven mood lift detected from past visits.", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", tone: "wine" },
        ].map((j) => (
          <Card key={j.t} className="hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-${j.tone}/10 text-${j.tone}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d={j.icon}/></svg>
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{j.c}</p>
                <p className="font-display text-lg text-foreground">{j.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{j.desc}</p>
              </div>
            </div>
            <button className="mt-4 w-full rounded-full border border-border bg-ivory px-4 py-2 text-xs text-olive hover:bg-cream">Begin</button>
          </Card>
        ))}

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">90-day longevity plan</p>
            <Pill tone="moss">Designed by Dr. Costa</Pill>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 md:grid-cols-12">
            {Array.from({length:12}).map((_,i) => (
              <div key={i} className={`rounded-2xl border p-3 ${i<3?"border-olive bg-olive/10":"border-border bg-cream/40"}`}>
                <p className="text-[10px] text-muted-foreground">Week {i+1}</p>
                <p className="mt-1 font-display text-sm text-olive">{["Foundation","Strength","Cardio","Sleep","Mind","Social","Strength","Cardio","Mind","Sleep","Reset","Review"][i]}</p>
                {i<3 && <Pill tone="moss">done</Pill>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
