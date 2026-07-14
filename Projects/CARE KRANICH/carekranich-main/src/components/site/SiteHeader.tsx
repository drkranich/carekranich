import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const primaryCta = user ? { to: "/app", label: "Open dashboard" } : { to: "/signup", label: "Start care journey" };
  const navItems = [
    { to: "/family-center", label: "Family" },
    { to: "/caregiver-app", label: "Caregivers" },
    { to: "/medical-office", label: "Clinics" },
    { to: "/solutions/home-care", label: "Solutions" },
    { to: "/about", label: "Company" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/45 shadow-soft backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-olive text-ivory shadow-soft">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" />
            </svg>
          </div>
          <span className="font-display text-2xl text-olive">Care Kranich</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-foreground/70 md:flex">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="group relative transition-colors hover:text-olive"
              activeProps={{ className: "text-olive" }}
            >
              <span className="relative">
                {n.label}
                <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-olive transition-transform duration-300 group-hover:scale-x-100" />
              </span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {!loading && (
            user
              ? <span className="hidden text-sm text-foreground/70 sm:inline">Welcome back</span>
              : <Link to="/login" className="hidden text-sm text-foreground/70 hover:text-olive sm:inline">Sign in</Link>
          )}
          <Link to={primaryCta.to} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:translate-y-[-1px] hover:opacity-95">
            {primaryCta.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
