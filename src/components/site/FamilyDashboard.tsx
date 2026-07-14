import { Link } from "@tanstack/react-router";
import handsImg from "@/assets/hands.jpg";

export function FamilyDashboard() {
  const timeline = [
    { time: "07:30", title: "Morning routine", note: "Slept 7h 42m - woke calm", tone: "bg-moss" },
    { time: "08:15", title: "Breakfast", note: "Ate 90% - porridge & berries", tone: "bg-gold" },
    { time: "09:00", title: "Medication", note: "Atorvastatin - Vitamin D", tone: "bg-olive" },
    { time: "10:30", title: "Walk in the garden", note: "1,240 steps - mood lifted", tone: "bg-terracotta" },
  ];

  return (
    <section id="family" className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <div className="relative">
          <div className="overflow-hidden rounded-3xl shadow-elevated">
            <img src={handsImg} alt="Caregiver and elder hands" loading="lazy" width={1200} height={1400} className="h-full w-full object-cover" />
          </div>
          <div className="absolute -right-2 -bottom-6 w-[22rem] rounded-2xl border border-white/65 bg-white/55 p-6 shadow-elevated backdrop-blur-2xl md:-right-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Today - Maria</p>
                <p className="text-lg font-semibold text-olive">A peaceful morning</p>
              </div>
              <div className="rounded-full border border-moss/20 bg-moss/10 px-2.5 py-1 text-xs text-moss">All clear</div>
            </div>
            <ol className="mt-5 space-y-4">
              {timeline.map((t) => (
                <li key={t.time} className="flex gap-4">
                  <div className="w-10 pt-1 text-xs tabular-nums text-muted-foreground">{t.time}</div>
                  <div className={`mt-1.5 h-2 w-2 rounded-full ${t.tone}`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-wine">For families</span>
          <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl text-balance">
            Be present, even when you're far.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            A living timeline of your loved one's day - meals, medication, mood, movement and meaningful moments - written in plain language by caregivers and gently summarized by Care Kranich AI.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/family-center" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
              Open Family Center
            </Link>
            <Link to="/signup" className="rounded-full border border-border bg-ivory/70 px-5 py-2.5 text-sm font-semibold text-olive">
              Create family account
            </Link>
          </div>
          <ul className="mt-8 space-y-4">
            {[
              "Tonight's letter: an AI-written summary delivered every evening at 8 PM.",
              "Real-time vitals from any wearable - paired in seconds.",
              "Secure family chat, video calls and shared photo album.",
              "One-tap SOS that reaches caregiver, neighbor and emergency services.",
            ].map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-olive/10 text-olive">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
                <span className="text-sm leading-relaxed text-foreground/80">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
