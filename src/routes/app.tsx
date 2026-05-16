import { Link, Outlet, createFileRoute, useRouterState, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";

const sections = [
  {
    title: "Care",
    items: [
      { to: "/app", label: "Overview", icon: "M3 12l9-9 9 9 M5 10v10h14V10" },
      { to: "/app/timeline", label: "Timeline", icon: "M12 6v6l4 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
      { to: "/app/care-plan", label: "Care plan", icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
      { to: "/app/profile", label: "Life profile", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
      { to: "/app/memory", label: "Memory & legacy", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
      { to: "/app/emergency", label: "Emergency", icon: "M12 2L1 21h22L12 2z M12 9v4 M12 17h.01" },
    ],
  },
  {
    title: "People",
    items: [
      { to: "/app/caregiver", label: "Caregiver", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
      { to: "/app/quality", label: "Quality & wellbeing", icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" },
      { to: "/app/academy", label: "Academy", icon: "M22 10v6 M2 10l10-5 10 5-10 5z M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" },
      { to: "/app/medical", label: "Medical", icon: "M19 14V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8 M5 14h14v6H5z M12 8v4 M10 10h4" },
      { to: "/app/marketplace", label: "Marketplace", icon: "M3 9l1-5h16l1 5 M3 9h18v11H3z M9 13h6" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/app/ai", label: "AI Insights", icon: "M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M2 12h4 M18 12h4" },
      { to: "/app/alerts", label: "Alert center", icon: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" },
      { to: "/app/workflows", label: "Workflows", icon: "M4 6h6 M4 12h10 M4 18h6 M14 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M14 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0" },
      { to: "/app/smart-home", label: "Smart Home", icon: "M3 12l9-9 9 9 M5 10v10h14V10 M9 20v-6h6v6" },
      { to: "/app/longevity", label: "Longevity", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67 10.94 4.61a5.5 5.5 0 0 0-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 0 0 0-7.78z" },
      { to: "/app/telemedicine", label: "Telemedicine", icon: "M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/app/command", label: "Command center", icon: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
      { to: "/app/notifications", label: "Notifications", icon: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" },
      { to: "/app/documents", label: "Documents", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8" },
      { to: "/app/tenants", label: "Tenants", icon: "M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-4" },
      { to: "/app/admin", label: "Super Admin", icon: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z" },
    ],
  },
];

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading, profile, roles, signOut, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" />;

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
            <Avatar name={profile?.full_name ?? user.email ?? "U"} tone="olive" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{profile?.full_name ?? user.email}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">{roles[0]?.replace("_", " ") ?? "member"}</p>
            </div>
            <button onClick={() => signOut().then(() => navigate({ to: "/login" }))} title="Sign out" className="text-muted-foreground hover:text-wine">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/></svg>
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
          <div className="relative flex items-center gap-3">
            <button className="relative rounded-full border border-border bg-ivory p-2 text-muted-foreground hover:text-olive">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse-soft rounded-full bg-wine" />
            </button>
            {hasAnyRole(["family", "caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]) && (
              <button onClick={() => navigate({ to: "/app/emergency" })} className="rounded-full bg-wine px-4 py-2 text-xs text-ivory shadow-soft hover:opacity-90">SOS</button>
            )}
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full">
              <Avatar name={profile?.full_name ?? user.email ?? "U"} tone="olive" size={32} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-border bg-card p-2 shadow-elevated">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="truncate text-sm text-foreground">{profile?.full_name ?? user.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <button onClick={() => { setMenuOpen(false); navigate({ to: "/app/profile" }); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream">Life profile</button>
                <button onClick={() => { setMenuOpen(false); navigate({ to: "/app/tenants" }); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream">Organization</button>
                <button onClick={async () => { setMenuOpen(false); await signOut(); navigate({ to: "/login" }); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-wine hover:bg-wine/5">Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main className="px-6 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
