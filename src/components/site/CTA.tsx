import { Link } from "@tanstack/react-router";

export function CTA() {
  return (
    <section id="start" className="px-6 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/65 bg-gradient-olive p-10 text-ivory shadow-elevated md:p-16">
        <div className="absolute inset-x-0 top-0 h-px glass-line" />
        <div className="relative grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-baby">Start here</div>
            <h2 className="mt-3 font-display text-4xl text-balance md:text-5xl">
              Begin with the right care path.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-ivory/80">
              Create a family account, or talk to us about an agency, clinic, senior-living community or enterprise rollout.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <Link to="/signup" className="rounded-2xl bg-ivory px-5 py-4 text-sm font-semibold text-olive shadow-elevated transition hover:-translate-y-0.5">
              Create family account
            </Link>
            <Link to="/contact" className="rounded-2xl border border-white/30 bg-white/12 px-5 py-4 text-sm font-semibold text-ivory backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/18">
              Talk to Care Kranich
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
