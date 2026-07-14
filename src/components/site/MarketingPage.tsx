import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PublicChatBox } from "@/components/site/PublicChatBox";
import type { ReactNode } from "react";

export type Crumb = { label: string; to?: string };
type RouteLink = { label: string; to: string; description?: string };

const publicRouteLinks: RouteLink[] = [
  { label: "Family Center", to: "/family-center", description: "The day-to-day experience for families." },
  { label: "Caregiver App", to: "/caregiver-app", description: "Field work, medication and shift handoff." },
  { label: "Medical Office", to: "/medical-office", description: "Clinician workspace and longitudinal care." },
  { label: "Smart Home", to: "/smart-home", description: "Ambient sensing and home safety." },
  { label: "Telemedicine", to: "/telemedicine", description: "Remote consults and follow-up care." },
  { label: "Solutions", to: "/solutions", description: "Use cases for operators and partners." },
];

export function MarketingPage({
  eyebrow,
  title,
  lede,
  crumbs,
  primaryCta,
  secondaryCta,
  related,
  showExplorer = true,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  crumbs?: Crumb[];
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  related?: RouteLink[];
  showExplorer?: boolean;
  children?: ReactNode;
}) {
  const explorerLinks = related ?? publicRouteLinks;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-hero">
          <div className="absolute inset-0 grain opacity-30" />
          <div className="absolute inset-x-0 top-0 h-px glass-line" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.15fr_0.85fr] md:items-end md:py-28">
            <div>
              {crumbs && (
                <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Link to="/" className="hover:text-olive">Home</Link>
                  {crumbs.map((c, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <span aria-hidden>/</span>
                      {c.to ? (
                        <Link to={c.to} className="hover:text-olive">{c.label}</Link>
                      ) : (
                        <span className="text-olive">{c.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              )}

              {eyebrow && (
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-ivory/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-olive backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-moss" />
                  {eyebrow}
                </span>
              )}

              <h1 className="mt-5 max-w-4xl font-display text-4xl text-foreground text-balance md:text-6xl">
                {title}
              </h1>

              {lede && (
                <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground text-pretty md:text-lg">
                  {lede}
                </p>
              )}

              {(primaryCta || secondaryCta) && (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {primaryCta && (
                    <Link to={primaryCta.to} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition hover:translate-y-[-1px] hover:opacity-90">
                      {primaryCta.label}
                    </Link>
                  )}
                  {secondaryCta && (
                    <Link to={secondaryCta.to} className="group inline-flex items-center gap-2 rounded-full border border-border bg-ivory/65 px-6 py-3 text-sm font-semibold text-olive backdrop-blur transition hover:bg-ivory">
                      {secondaryCta.label}
                      <span className="transition-transform group-hover:translate-x-0.5">-&gt;</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="glass-panel rounded-3xl p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">Next paths</p>
              <p className="mt-3 text-sm leading-7 text-foreground/78">
                Most teams understand Care Kranich fastest by moving through these adjacent parts of the care journey.
              </p>
              <div className="mt-5 grid gap-2">
                {explorerLinks.slice(0, 3).map((link) => (
                  <Link key={link.to} to={link.to} className="rounded-2xl border border-border/70 bg-ivory/55 px-4 py-3 text-sm font-semibold text-olive transition hover:bg-ivory">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          {children}
          {showExplorer && <PageExplorer links={explorerLinks} />}
        </div>
      </main>
      <SiteFooter />
      <PublicChatBox />
    </div>
  );
}

export function FeatureGrid({ items }: { items: { title: string; body: string; icon?: string; to?: string; cta?: string }[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => {
        const content = (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive/10 text-olive">
              {f.icon ? <span className="text-base font-semibold">{f.icon}</span> : <span className="h-2.5 w-2.5 rounded-full bg-olive" />}
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-snug text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground text-pretty">{f.body}</p>
            {f.to && <span className="mt-5 inline-flex text-sm font-semibold text-olive">{f.cta ?? "Explore"} -&gt;</span>}
          </>
        );

        return f.to ? (
          <Link key={f.title} to={f.to} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
            {content}
          </Link>
        ) : (
          <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function Section({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="mt-20 first:mt-0">
      {kicker && <div className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">{kicker}</div>}
      <h2 className="mt-2 max-w-3xl font-display text-3xl text-foreground text-balance md:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function ProseList({ items }: { items: { term: string; def: string }[] }) {
  return (
    <dl className="grid gap-6 md:grid-cols-2">
      {items.map((i) => (
        <div key={i.term} className="rounded-2xl border border-border bg-card p-6">
          <dt className="text-base font-semibold text-olive">{i.term}</dt>
          <dd className="mt-2 text-sm leading-7 text-muted-foreground">{i.def}</dd>
        </div>
      ))}
    </dl>
  );
}

function PageExplorer({ links }: { links: RouteLink[] }) {
  return (
    <section className="mt-20 rounded-3xl border border-border bg-cream/55 p-6 shadow-soft md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-moss">Continue exploring</div>
          <h2 className="mt-2 font-display text-3xl text-foreground">Choose the next care path.</h2>
        </div>
        <Link to="/contact" className="w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
          Talk to Care Kranich
        </Link>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="rounded-2xl border border-border bg-ivory/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-soft">
            <div className="text-sm font-semibold text-olive">{link.label}</div>
            {link.description && <p className="mt-1 text-xs leading-6 text-muted-foreground">{link.description}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
