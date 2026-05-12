import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Spark, Bars, Ring, Avatar, Stat } from "@/components/app/primitives";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

function Overview() {
  return (
    <>
      <PageHeader
        title="Good morning, Inês"
        subtitle="Maria is having a peaceful Tuesday — all signs are gentle and steady."
        action={<Pill tone="moss"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-moss" /> All clear · live</Pill>}
      />

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Wellness score" value="92" sub="▲ 4 this week" tone="olive" />
        <Stat label="Adherence" value="98%" sub="Medication on time" tone="moss" />
        <Stat label="Sleep" value="7h 42m" sub="Quality 88/100" tone="gold" />
        <Stat label="Mood" value="Calm" sub="Stable · 6 day streak" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Vitals */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Live vitals</p>
              <h3 className="mt-1 font-display text-xl text-foreground">Last 24 hours</h3>
            </div>
            <div className="flex gap-2">
              {["24h","7d","30d"].map((t,i) => (
                <button key={t} className={`rounded-full px-3 py-1 text-xs ${i===0 ? "bg-olive text-ivory" : "bg-muted text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {[
              { label: "Heart rate", value: "72", unit: "bpm", color: "var(--wine)", data: [70,72,71,74,73,72,75,73,72,71,72,73] },
              { label: "Oxygen (SpO₂)", value: "97", unit: "%", color: "var(--moss)", data: [96,97,97,97,98,97,97,96,97,97,98,97] },
              { label: "Glucose", value: "104", unit: "mg/dL", color: "var(--gold)", data: [98,102,108,115,110,104,100,102,106,109,107,104] },
              { label: "Blood pressure", value: "118 / 76", unit: "mmHg", color: "var(--olive)", data: [116,118,120,119,118,117,118,119,120,118,117,118] },
            ].map((v) => (
              <div key={v.label} className="rounded-2xl border border-border bg-cream/40 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{v.label}</span>
                  <Pill tone="moss">normal</Pill>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl text-foreground">{v.value}</span>
                  <span className="text-xs text-muted-foreground">{v.unit}</span>
                </div>
                <div className="mt-2"><Spark points={v.data} color={v.color} /></div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Letter */}
        <Card>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-wine text-ivory">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83"/></svg>
            </div>
            <div>
              <p className="font-display text-sm text-olive">Tonight's letter</p>
              <p className="text-xs text-muted-foreground">Drafted by Olia AI · 8:00 PM</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-foreground/85 italic">
            "Maria slept 7h 42m and woke unprompted at 7:14 — calm and rested. She ate a full breakfast,
            walked 1,240 steps in the garden with Sofia, and laughed during her video call with you.
            Vitals remained gentle. A truly peaceful day."
          </p>
          <div className="mt-5 flex items-center gap-2">
            <Pill tone="moss">7h sleep</Pill>
            <Pill tone="gold">3 meals</Pill>
            <Pill tone="terracotta">1 walk</Pill>
            <Pill tone="wine">2 calls</Pill>
          </div>
          <button className="mt-6 w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90">Read full letter</button>
        </Card>

        {/* Caregiver */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Caregiver on shift</p>
              <h3 className="mt-1 font-display text-xl text-foreground">Sofia Mendes</h3>
            </div>
            <Pill tone="moss"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-moss" /> On site · 4h 12m</Pill>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <Avatar name="Sofia Mendes" tone="terracotta" size={56} />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
                Verified at home · Rua das Oliveiras, 12
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone="olive">5y experience</Pill>
                <Pill tone="gold">★ 4.9</Pill>
                <Pill tone="wine">Geriatrics certified</Pill>
              </div>
            </div>
            <button className="rounded-full border border-border bg-ivory px-4 py-2 text-xs text-olive hover:bg-cream">Message</button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/60 pt-5">
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Tasks done</p><p className="mt-1 font-display text-2xl text-olive">12<span className="text-sm text-muted-foreground">/14</span></p></div>
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Notes</p><p className="mt-1 font-display text-2xl text-olive">3</p></div>
            <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Photos</p><p className="mt-1 font-display text-2xl text-olive">7</p></div>
          </div>
        </Card>

        {/* Wellness rings */}
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily rhythm</p>
          <div className="mt-4 space-y-5">
            <Ring value={92} label="Wellness" sub="Cardiovascular · stable" color="var(--olive)" size={110} />
            <Ring value={78} label="Hydration" sub="6 of 8 glasses" color="var(--gold)" size={110} />
            <Ring value={84} label="Movement" sub="1,240 / 2,500 steps" color="var(--terracotta)" size={110} />
          </div>
        </Card>

        {/* Activity */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Weekly activity</p>
              <h3 className="mt-1 font-display text-xl text-foreground">Steps & active minutes</h3>
            </div>
            <Pill tone="terracotta">+18% vs last week</Pill>
          </div>
          <div className="mt-6">
            <Bars values={[820, 1100, 940, 1320, 1200, 1450, 1240]} color="var(--olive)" height={120} />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <span key={d}>{d}</span>)}
            </div>
          </div>
        </Card>

        {/* Alerts */}
        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Gentle alerts</p>
          <ul className="mt-4 space-y-3">
            {[
              { tone: "gold", title: "Hydration trending low", note: "Suggest a glass of water before lunch" },
              { tone: "moss", title: "Telemed follow-up Friday", note: "Dr. Costa · cardiology · 10:30" },
              { tone: "wine", title: "Prescription renewal", note: "Atorvastatin in 4 days" },
            ].map((a) => (
              <li key={a.title} className="flex gap-3 rounded-2xl border border-border/60 bg-cream/40 p-3">
                <span className={`mt-1.5 h-2 w-2 flex-none rounded-full bg-${a.tone}`}></span>
                <div>
                  <p className="text-sm text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
