import heroImg from "@/assets/hero-elder.jpg";

const signals = [
  { label: "Active care lives", value: "12.4k" },
  { label: "Alert response", value: "2m 18s" },
  { label: "Family clarity", value: "4.9/5" },
];

export function Hero() {
  return (
    <section className="relative min-h-[86vh] overflow-hidden bg-background">
      <img
        src={heroImg}
        alt="Older adult relaxing at home with soft morning light"
        width={1600}
        height={1200}
        className="absolute inset-0 h-full w-full object-cover opacity-42"
      />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-x-0 top-0 h-px glass-line" />

      <div className="relative mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-center px-6 py-24 md:py-28">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-3 py-1 text-xs text-olive shadow-soft backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-wine shadow-glow" />
            Live care intelligence for families, teams and clinics
          </span>

          <h1 className="mt-7 max-w-4xl font-display text-6xl leading-[0.98] text-foreground text-balance md:text-8xl">
            Care Kranich
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/72 text-balance md:text-xl">
            A glass-clear operating system for elder care: monitoring, care plans,
            family updates, AI agents and digital twin insight in one calm workspace.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#start" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elevated transition hover:translate-y-[-1px] hover:opacity-95">
              Start care journey
            </a>
            <a href="#caregivers" className="rounded-full border border-white/70 bg-white/45 px-6 py-3 text-sm font-medium text-olive shadow-soft backdrop-blur-xl transition hover:bg-white/70">
              See the platform
            </a>
          </div>
        </div>

        <div className="mt-14 grid max-w-4xl gap-3 sm:grid-cols-3">
          {signals.map((signal) => (
            <div key={signal.label} className="glass-panel rounded-2xl px-5 py-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{signal.label}</p>
              <p className="mt-2 font-display text-3xl text-olive">{signal.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
