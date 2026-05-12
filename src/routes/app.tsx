import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Avatar } from "@/components/app/primitives";

const sections = [
  {
    title: "Care",
    items: [
      { to: "/app", label: "Overview", icon: "M3 12l9-9 9 9 M5 10v10h14V10" },
      { to: "/app/timeline", label: "Timeline", icon: "M12 6v6l4 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
      { to: "/app/emergency", label: "Emergency", icon: "M12 2L1 21h22L12 2z M12 9v4 M12 17h.01" },
    ],
  },
  {
    title: "People",
    items: [
      { to: "/app/caregiver", label: "Caregiver", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
      { to: "/app/medical", label: "Medical", icon: "M19 14V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8 M5 14h14v6H5z M12 8v4 M10 10h4" },
      { to: "/app/marketplace", label: "Marketplace", icon: "M3 9l1-5h16l1 5 M3 9h18v11H3z M9 13h6" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/app/ai", label: "AI Insights", icon: "M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M2 12h4 M18 12h4" },
      { to: "/app/smart-home", label: "Smart Home", icon: "M3 12l9-9 9 9 M5 10v10h14V10 M9 20v-6h6v6" },
      { to: "/app/longevity", label: "Longevity", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67 10.94 4.61a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z" },
      { to: "/app/telemedicine", label: "Telemedicine", icon: "M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/app/admin", label: "Super Admin", icon: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z" },
    ],
  },
];

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-border bg-cream/40 backdrop-blur-xl lg:flex">
        <Link to="/" className="flex items-center gap-2 border-b border-border/60 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" />
            </svg>
          </div>
          <span className="font-display text-xl text-olive">Olia</span>
          <span className="ml-auto rounded-full bg-wine/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-wine">Pro</span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {sections.map((sec) => (
            <div key={sec.title} className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{sec.title}</p>
              <nav className="space-y-0.5">
                {sec.items.map((item) => {
                  const active = path === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                        active ? "bg-olive text-ivory shadow-soft" : "text-foreground/70 hover:bg-ivory hover:text-olive"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.icon} />
                      </svg>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-border/60 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ivory p-3">
            <Avatar name="Maria Lopes" tone="wine" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">Maria Lopes</p>
              <p className="truncate text-xs text-muted-foreground">Care recipient</p>
            </div>
            <button className="text-muted-foreground hover:text-olive">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-ivory/70 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-olive text-ivory">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" /></svg>
              </div>
              <span className="font-display text-lg text-olive">Olia</span>
            </Link>
            <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-ivory px-3 py-1.5">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <input placeholder="Search residents, caregivers, alerts…" className="w-72 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"/>
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-full border border-border bg-ivory p-2 text-muted-foreground hover:text-olive">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse-soft rounded-full bg-wine" />
            </button>
            <button className="rounded-full bg-wine px-4 py-2 text-xs text-ivory shadow-soft hover:opacity-90">SOS</button>
            <Avatar name="Inês Ribeiro" tone="olive" size={32} />
          </div>
        </header>
        <main className="px-6 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
