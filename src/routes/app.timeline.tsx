import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/timeline")({
  component: Timeline,
});

const events = [
  { time: "07:14", type: "wake", icon: "M12 3v2 M12 19v2 M5 12H3 M21 12h-2 M5.6 5.6L4.2 4.2 M19.8 19.8l-1.4-1.4 M5.6 18.4L4.2 19.8 M19.8 4.2l-1.4 1.4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", title: "Maria woke gently", note: "Slept 7h 42m · woke unprompted", tone: "gold" },
  { time: "07:30", type: "routine", icon: "M3 12l9-9 9 9", title: "Morning routine", note: "Personal hygiene completed by Sofia", tone: "moss", caregiver: "Sofia Mendes" },
  { time: "08:15", type: "meal", icon: "M3 12h18 M12 3v18", title: "Breakfast — porridge & berries", note: "Ate 90% · enjoyed the company", tone: "terracotta", photo: true },
  { time: "09:00", type: "med", icon: "M9 11H4v8h5 M15 11h5v8h-5 M9 11V3h6v8", title: "Medication administered", note: "Atorvastatin 20mg · Vitamin D 1000IU", tone: "olive" },
  { time: "10:30", type: "walk", icon: "M13 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M5 21l4-7 4 4 5-9", title: "Walk in the garden", note: "1,240 steps · mood lifted", tone: "moss", caregiver: "Sofia Mendes" },
  { time: "11:45", type: "call", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07", title: "Video call with Inês", note: "12 min · she laughed three times", tone: "wine", photo: true },
  { time: "13:00", type: "meal", icon: "M3 12h18", title: "Lunch — grilled fish & vegetables", note: "Full plate · stable glucose response", tone: "terracotta" },
  { time: "14:30", type: "rest", icon: "M22 12a10 10 0 0 1-10 10 M12 2a10 10 0 0 1 10 10", title: "Quiet rest", note: "Reading for 40 minutes", tone: "muted" },
  { time: "16:00", type: "med", icon: "M9 11H4v8h5", title: "Afternoon medication", note: "Losartan 50mg", tone: "olive" },
  { time: "17:15", type: "social", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", title: "Visit from neighbor Helena", note: "30 min conversation · brought tulips", tone: "gold", photo: true },
  { time: "20:00", type: "letter", icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8", title: "Tonight's AI letter sent", note: "Delivered to Inês · read at 20:14", tone: "wine" },
  { time: "22:30", type: "sleep", icon: "M21 12.79A9 9 0 1 1 11.21 3", title: "Asleep", note: "Light off at 22:34 · gentle breathing", tone: "olive" },
];

function Timeline() {
  return (
    <>
      <PageHeader
        title="Today with Maria"
        subtitle="Tuesday, May 12 · A peaceful day, gently observed."
        action={
          <div className="flex gap-2">
            <button className="rounded-full bg-ivory border border-border px-4 py-2 text-xs text-olive hover:bg-cream">← Yesterday</button>
            <button className="rounded-full bg-ivory border border-border px-4 py-2 text-xs text-muted-foreground" disabled>Tomorrow →</button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ol className="relative">
            <div className="absolute left-[5.5rem] top-2 bottom-2 w-px bg-border" />
            {events.map((e) => (
              <li key={e.time} className="relative flex gap-6 py-4">
                <div className="w-16 flex-none pt-1 text-right">
                  <p className="font-display text-base tabular-nums text-olive">{e.time}</p>
                </div>
                <div className={`relative z-10 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-${e.tone}/15 text-${e.tone} ring-4 ring-card`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={e.icon} />
                  </svg>
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.note}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {e.caregiver && (<><Avatar name={e.caregiver} tone="terracotta" size={20} /><span className="text-[11px] text-muted-foreground">{e.caregiver}</span></>)}
                    {e.photo && <Pill tone="muted">📷 1 photo</Pill>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Today's summary</p>
            <h3 className="mt-2 font-display text-xl text-foreground">A truly gentle day</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl bg-cream/60 p-3"><p className="text-muted-foreground">Steps</p><p className="font-display text-xl text-olive">1,240</p></div>
              <div className="rounded-2xl bg-cream/60 p-3"><p className="text-muted-foreground">Meals</p><p className="font-display text-xl text-olive">3 full</p></div>
              <div className="rounded-2xl bg-cream/60 p-3"><p className="text-muted-foreground">Meds</p><p className="font-display text-xl text-olive">5/5</p></div>
              <div className="rounded-2xl bg-cream/60 p-3"><p className="text-muted-foreground">Mood</p><p className="font-display text-xl text-wine">Calm</p></div>
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Filters</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["All", "Meals", "Medication", "Movement", "Social", "Sleep", "Photos"].map((f, i) => (
                <Pill key={f} tone={i === 0 ? "olive" : "muted"}>{f}</Pill>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Memories captured</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-sage/40 to-terracotta/30" />
              ))}
            </div>
            <button className="mt-4 w-full rounded-full bg-olive px-4 py-2 text-xs text-ivory hover:opacity-90">Open album</button>
          </Card>
        </div>
      </div>
    </>
  );
}
