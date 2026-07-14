import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PlatformBrandLogo } from "@/components/PlatformBrand";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const primaryCta = user ? { to: "/app", label: "Open dashboard" } : { to: "/signup", label: "Start care journey" };
  const navItems = [
    { to: "/family-center", label: "Family" },
    { to: "/caregiver-app", label: "Caregivers" },
    { to: "/medical-office", label: "Clinics" },
    { to: "/solutions", label: "Solutions" },
    { to: "/about", label: "Company" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/45 shadow-soft backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <PlatformBrandLogo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/70 md:flex">
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
