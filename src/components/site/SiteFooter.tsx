import { Link } from "@tanstack/react-router";

type LinkItem = { label: string; to: string };

export function SiteFooter() {
  const cols: { title: string; links: LinkItem[] }[] = [
    { title: "Platform", links: [
      { label: "Family Center", to: "/family-center" },
      { label: "Caregiver App", to: "/caregiver-app" },
      { label: "Medical Office", to: "/medical-office" },
      { label: "Smart Home", to: "/smart-home" },
      { label: "Telemedicine", to: "/telemedicine" },
    ]},
    { title: "Solutions", links: [
      { label: "Home Care", to: "/solutions/home-care" },
      { label: "Clinics", to: "/solutions/clinics" },
      { label: "Senior Living", to: "/solutions/senior-living" },
      { label: "Hospitals", to: "/solutions/hospitals" },
      { label: "Insurance", to: "/solutions/insurance" },
    ]},
    { title: "Company", links: [
      { label: "About", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
      { label: "Partners", to: "/partners" },
      { label: "Contact", to: "/contact" },
    ]},
    { title: "Trust", links: [
      { label: "Security", to: "/security" },
      { label: "GDPR & LGPD", to: "/privacy-compliance" },
      { label: "Compliance", to: "/compliance" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ]},
  ];
  return (
    <footer className="border-t border-border/60 bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-6">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-olive text-ivory">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" />
                </svg>
              </div>
              <span className="font-display text-2xl text-olive">Olia</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The operating system for elderly care and longevity. Built with dignity, designed for families.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-olive">{c.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="group relative inline-flex items-center transition-colors hover:text-olive focus:outline-none focus-visible:text-olive"
                      activeProps={{ className: "text-olive" }}
                    >
                      <span className="relative">
                        {l.label}
                        <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-olive transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Olia Care Systems. Crafted with care.</p>
          <p className="font-display italic">"To grow old surrounded by attention is a kind of luxury."</p>
        </div>
      </div>
    </footer>
  );
}
