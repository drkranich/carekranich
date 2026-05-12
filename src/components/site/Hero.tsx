import heroImg from "@/assets/hero-elder.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 grain opacity-40" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28 lg:py-32">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-ivory/60 px-3 py-1 text-xs text-olive backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-moss" />
            Now monitoring 12,400+ lives with care
          </span>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] text-foreground text-balance md:text-6xl lg:text-7xl">
            Care that feels like
            <span className="block italic text-olive">family, again.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-balance">
            Olia is the calm, intelligent platform that connects families, caregivers and clinicians around the people they love — in one elegant, human experience.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#start" className="rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground shadow-elevated hover:opacity-90">
              Start a 14-day trial
            </a>
            <a href="#tour" className="group inline-flex items-center gap-2 rounded-full border border-border bg-ivory/60 px-6 py-3 text-sm text-olive backdrop-blur hover:bg-ivory">
              Watch the 90-second tour
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
          </div>
          <div className="mt-10 flex items-center gap-8 text-xs text-muted-foreground">
            <div><div className="font-display text-2xl text-olive">99.98%</div>uptime</div>
            <div className="h-8 w-px bg-border" />
            <div><div className="font-display text-2xl text-olive">HIPAA</div>GDPR · LGPD</div>
            <div className="h-8 w-px bg-border" />
            <div><div className="font-display text-2xl text-olive">4.9★</div>family rating</div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[3rem] bg-gradient-olive opacity-10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] shadow-elevated">
            <img src={heroImg} alt="Elder enjoying a calm morning at home" width={1600} height={1200} className="h-full w-full object-cover" />
          </div>
          {/* Floating cards */}
          <div className="absolute -left-4 top-10 hidden w-56 rounded-2xl bg-card p-4 shadow-elevated animate-float md:block">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Heart rate</span>
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-moss" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-3xl text-olive">72</span>
              <span className="text-xs text-muted-foreground">bpm · resting</span>
            </div>
            <svg viewBox="0 0 100 24" className="mt-2 h-6 w-full text-moss">
              <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points="0,14 12,14 16,6 22,20 28,12 40,12 46,4 52,18 58,12 70,12 76,8 82,16 100,12"/>
            </svg>
          </div>
          <div className="absolute -right-4 bottom-10 hidden w-60 rounded-2xl bg-card p-4 shadow-elevated md:block">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wine/10 text-wine">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z M12 8v4l3 2"/></svg>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Caregiver check-in</div>
                <div className="text-sm text-foreground">Sofia · 09:14 AM</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">"Mom slept well, took her morning medication and is reading on the porch."</p>
          </div>
        </div>
      </div>
    </section>
  );
}
