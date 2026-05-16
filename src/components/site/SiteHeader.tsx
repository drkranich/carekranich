import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-ivory/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" />
            </svg>
          </div>
          <span className="font-display text-xl text-olive">Olia</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-foreground/70 md:flex">
          <a href="#platform" className="hover:text-olive">Platform</a>
          <a href="#family" className="hover:text-olive">For Families</a>
          <a href="#caregivers" className="hover:text-olive">For Caregivers</a>
          <a href="#clinics" className="hover:text-olive">For Clinics</a>
          <a href="#pricing" className="hover:text-olive">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden text-sm text-foreground/70 hover:text-olive sm:inline">Sign in</Link>
          <Link to="/signup" className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-soft hover:opacity-90">
            Begin care
          </Link>
        </div>
      </div>
    </header>
  );
}
