export function SiteFooter() {
  const cols = [
    { title: "Platform", links: ["Family Hub", "Caregiver App", "Medical Suite", "Smart Home", "Telemedicine"] },
    { title: "Solutions", links: ["Home Care", "Clinics", "Senior Living", "Hospitals", "Insurance"] },
    { title: "Company", links: ["About", "Careers", "Press", "Partners", "Contact"] },
    { title: "Trust", links: ["Security", "GDPR & LGPD", "Compliance", "Privacy", "Terms"] },
  ];
  return (
    <footer className="border-t border-border/60 bg-cream">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-olive text-ivory">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" />
                </svg>
              </div>
              <span className="font-display text-2xl text-olive">Olia</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The operating system for elderly care and longevity. Built with dignity, designed for families.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-olive">{c.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {c.links.map((l) => (<li key={l}><a href="#" className="hover:text-olive">{l}</a></li>))}
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
