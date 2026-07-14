import { Link } from "@tanstack/react-router";
import wellnessImg from "@/assets/wellness.jpg";

export function Longevity() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-5 lg:items-center">
        <div className="lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-terracotta">Longevity & wellbeing</span>
          <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl text-balance">
            More years.<br/><span className="italic text-olive">More life in them.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Personalised plans for movement, nutrition, sleep and cognitive vitality - guided by Care Kranich's longevity intelligence and reviewed by your care team.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/solutions/clinics" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
              For clinics
            </Link>
            <Link to="/contact" className="rounded-full border border-border bg-ivory/70 px-5 py-2.5 text-sm font-semibold text-olive">
              Discuss longevity care
            </Link>
          </div>
          <div className="mt-8 flex gap-6">
            <div>
              <div className="font-display text-3xl text-olive">+4.2y</div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Healthspan added</div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <div className="font-display text-3xl text-olive">73%</div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sleep quality up</div>
            </div>
          </div>
        </div>

        <div className="relative lg:col-span-3">
          <div className="overflow-hidden rounded-3xl shadow-elevated">
            <img src={wellnessImg} alt="Wellness still life" loading="lazy" width={1200} height={1200} className="h-full w-full object-cover" />
          </div>
          <div className="absolute right-6 top-6 rounded-2xl border border-white/65 bg-white/55 p-4 shadow-elevated backdrop-blur-2xl">
            <div className="text-xs text-muted-foreground">Longevity score</div>
            <div className="mt-1 font-display text-4xl text-wine">87<span className="text-base text-muted-foreground">/100</span></div>
            <div className="mt-1 text-xs text-moss">+6 this month</div>
          </div>
        </div>
      </div>
    </section>
  );
}
