import { Link } from "@tanstack/react-router";

const pillars = [
  { title: "Real-time vitals", desc: "Heart, glucose, oxygen, sleep and movement - visualized with calm clarity.", icon: "M3 12h4l2-7 4 14 2-7h6", to: "/family-center" },
  { title: "AI daily summaries", desc: "Each evening, a warm note: how they slept, ate, moved and felt.", icon: "M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4", to: "/family-center" },
  { title: "Caregiver excellence", desc: "Shifts, check-ins, medication and notes - choreographed effortlessly.", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M17 3.13a4 4 0 0 1 0 7.75", to: "/caregiver-app" },
  { title: "Smart-home guardianship", desc: "Falls, stoves, doors and quiet hours - the home looks after itself.", icon: "M3 12l9-9 9 9 M5 10v10h14V10", to: "/smart-home" },
  { title: "Telemedicine", desc: "Doctors, therapists and specialists - one tap away, day or night.", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z", to: "/telemedicine" },
  { title: "Emotional wellbeing", desc: "Mood, conversation and loneliness signals - addressed with humanity.", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z", to: "/family-center" },
];

export function Pillars() {
  return (
    <section id="platform" className="scroll-mt-20 bg-ivory/70 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">The Care Kranich platform</span>
          <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            One quiet system for an entire circle of care.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Six modules, infinitely connected. From the smartwatch on the wrist to the cardiologist across the country.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <Link key={p.title} to={p.to} className="glass-panel rounded-2xl p-8 transition hover:translate-y-[-2px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-olive text-ivory shadow-soft">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={p.icon} />
                </svg>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{p.desc}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-olive">Open page -&gt;</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
