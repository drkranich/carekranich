import { Link } from "@tanstack/react-router";

const plans = [
  {
    name: "Family",
    price: "$49",
    period: "/month",
    blurb: "For one loved one and the whole family.",
    features: ["Real-time monitoring", "AI daily summaries", "Family chat & video", "1 caregiver seat", "Emergency response"],
    cta: "Start trial",
    to: "/signup",
    featured: false,
  },
  {
    name: "Care Home",
    price: "$8",
    period: "/resident / month",
    blurb: "For boutique residences and home-care agencies.",
    features: ["Unlimited caregivers", "Medical suite", "Marketplace access", "Smart-home integrations", "White-label option"],
    cta: "Talk to sales",
    to: "/contact",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "Clinics, hospitals and insurers.",
    features: ["SLA & dedicated CSM", "Advanced analytics", "Custom integrations", "On-premise option", "HIPAA / GDPR / LGPD"],
    cta: "Request demo",
    to: "/contact",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-cream/70 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">Pricing</span>
          <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl text-balance">
            Quiet pricing. Honest care.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">No commissions on caregiver wages. Cancel any time.</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-8 transition-shadow ${
                p.featured
                  ? "border-olive/35 bg-white/70 shadow-glow backdrop-blur-xl"
                  : "glass-panel"
              }`}
            >
              {p.featured && <div className="mb-4 inline-flex rounded-full border border-wine/20 bg-wine/10 px-3 py-1 text-xs text-wine">Most loved</div>}
              <h3 className="font-display text-2xl text-olive">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <Link to={p.to} className={`mt-6 block rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                p.featured ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border bg-ivory/80 text-olive hover:bg-white"
              }`}>{p.cta}</Link>
              <ul className="mt-7 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-foreground/80">
                    <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-moss" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
