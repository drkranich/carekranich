import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/caregiver")({
  component: CaregiverApp,
});

function CaregiverApp() {
  return (
    <>
      <PageHeader title="Caregiver app preview" subtitle="The mobile workspace caregivers actually love." />

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Phone 1 - Shift */}
        <Phone title="Today's shift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ivory/60">Tuesday · May 12</p>
              <p className="font-display text-xl text-ivory">8h shift</p>
            </div>
            <Pill tone="moss">On site</Pill>
          </div>
          <div className="mt-4 rounded-2xl bg-ivory/10 p-4">
            <div className="flex items-center gap-3">
              <Avatar name="Maria Lopes" tone="wine" size={44} />
              <div>
                <p className="text-sm text-ivory">Maria Lopes</p>
                <p className="text-[11px] text-ivory/60">82 · Cardiac care</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-ivory/70">
              <span>Checked in 09:14</span><span>4h 12m elapsed</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionBtn icon="M9 11l3 3 8-8" label="Check task" />
            <ActionBtn icon="M12 5v14 M5 12h14" label="Add note" />
            <ActionBtn icon="M23 7l-7 5 7 5V7z" label="Voice note" />
            <ActionBtn icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" label="Photo" />
          </div>
          <button className="mt-5 w-full rounded-2xl bg-wine px-4 py-3 text-sm text-ivory">SOS · escalate</button>
        </Phone>

        {/* Phone 2 - Tasks */}
        <Phone title="Tasks · 12 of 14">
          <ul className="space-y-2">
            {[
              { t: "Morning medication", d: "09:00 · Atorvastatin, Vit D", done: true },
              { t: "Breakfast support", d: "08:15 · Porridge & berries", done: true },
              { t: "Garden walk · 20 min", d: "10:30 · 1,240 steps", done: true },
              { t: "Hydration check", d: "11:30 · 6/8 glasses", done: true },
              { t: "Afternoon medication", d: "16:00 · Losartan 50mg", done: false, next: true },
              { t: "Cognitive exercise", d: "17:00 · Memory cards", done: false },
              { t: "Dinner & evening hygiene", d: "19:00", done: false },
            ].map((t) => (
              <li key={t.t} className={`flex items-center gap-3 rounded-2xl p-3 ${t.next ? "bg-wine/15 ring-1 ring-wine/30" : "bg-ivory/10"}`}>
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${t.done ? "bg-moss text-ivory" : "border border-ivory/30"}`}>
                  {t.done && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${t.done ? "text-ivory/50 line-through" : "text-ivory"}`}>{t.t}</p>
                  <p className="text-[11px] text-ivory/50">{t.d}</p>
                </div>
                {t.next && <Pill tone="wine">next</Pill>}
              </li>
            ))}
          </ul>
        </Phone>

        {/* Phone 3 - Vitals */}
        <Phone title="Log vitals">
          <div className="space-y-3">
            {[
              { l: "Blood pressure", v: "118/76", u: "mmHg", c: "moss" },
              { l: "Heart rate", v: "72", u: "bpm", c: "wine" },
              { l: "Glucose", v: "104", u: "mg/dL", c: "gold" },
              { l: "Oxygen", v: "97", u: "%", c: "moss" },
              { l: "Temperature", v: "36.4", u: "°C", c: "moss" },
            ].map((v) => (
              <div key={v.l} className="flex items-center justify-between rounded-2xl bg-ivory/10 p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-ivory/50">{v.l}</p>
                  <p className="mt-0.5 font-display text-lg text-ivory">{v.v} <span className="text-[11px] text-ivory/50">{v.u}</span></p>
                </div>
                <Pill tone={v.c as "moss" | "wine" | "gold"}>normal</Pill>
              </div>
            ))}
          </div>
          <button className="mt-5 w-full rounded-2xl bg-gradient-wine px-4 py-3 text-sm text-ivory">Submit reading</button>
        </Phone>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          { t: "Geolocated check-in", d: "Verified at the resident's address. Falsified shifts impossible.", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" },
          { t: "Voice-first workflows", d: "Dictate notes hands-free. AI transcribes, structures, and saves.", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4" },
          { t: "Offline first", d: "Field-tested in dead zones — every action syncs the moment signal returns.", icon: "M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0" },
        ].map((f) => (
          <div key={f.t} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-olive text-ivory">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d={f.icon}/></svg>
            </div>
            <h3 className="mt-4 font-display text-lg text-foreground">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Phone({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[2.5rem] border-[10px] border-foreground/90 bg-foreground/90 shadow-elevated">
        <div className="rounded-[2rem] bg-gradient-olive p-5 text-ivory">
          <div className="mb-4 flex items-center justify-between text-[11px] text-ivory/70">
            <span>9:41</span>
            <div className="flex gap-1.5">
              <span>5G</span><span>●●●</span>
            </div>
          </div>
          <p className="font-display text-sm text-ivory/70">{title}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 rounded-2xl bg-ivory/10 p-3 text-ivory">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d={icon}/></svg>
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
