import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { ReactNode } from "react";

export type Crumb = { label: string; to?: string };

export function MarketingPage({
  eyebrow,
  title,
  lede,
  crumbs,
  primaryCta,
  secondaryCta,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  crumbs?: Crumb[];
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-gradient-hero">
          <div className="absolute inset-0 grain opacity-30" />
          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
            {crumbs && (
              <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Link to="/" className="hover:text-olive">Home</Link>
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span aria-hidden>/</span>
                    {c.to ? <Link to={c.to} className="hover:text-olive">{c.label}</Link> : <span className="text-olive">{c.label}</span>}
                  </span>
                ))}
              </nav>
            )}
            {eyebrow && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-ivory/60 px-3 py-1 text-xs text-olive backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-moss" />
                {eyebrow}
              </span>
            )}
            <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] text-foreground text-balance md:text-6xl">
              {title}
            </h1>
            {lede && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">{lede}</p>}
            {(primaryCta || secondaryCta) && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {primaryCta && (
                  <Link to={primaryCta.to} className="rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground shadow-elevated transition hover:opacity-90">
                    {primaryCta.label}
                  </Link>
                )}
                {secondaryCta && (
                  <Link to={secondaryCta.to} className="group inline-flex items-center gap-2 rounded-full border border-border bg-ivory/60 px-6 py-3 text-sm text-olive backdrop-blur transition hover:bg-ivory">
                    {secondaryCta.label}
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
        <div className="mx-auto max-w-6xl px-6 py-20">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function FeatureGrid({ items }: { items: { title: string; body: string; icon?: string }[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive/10 text-olive">
            <span className="font-display text-lg">{f.icon ?? "◆"}</span>
          </div>
          <h3 className="mt-4 font-display text-xl text-foreground">{f.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
        </div>
      ))}
    </div>
  );
}

export function Section({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="mt-20 first:mt-0">
      {kicker && <div className="text-xs uppercase tracking-widest text-moss">{kicker}</div>}
      <h2 className="mt-2 max-w-2xl font-display text-3xl text-foreground md:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function ProseList({ items }: { items: { term: string; def: string }[] }) {
  return (
    <dl className="grid gap-6 md:grid-cols-2">
      {items.map((i) => (
        <div key={i.term} className="rounded-2xl border border-border bg-card p-6">
          <dt className="font-display text-lg text-olive">{i.term}</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.def}</dd>
        </div>
      ))}
    </dl>
  );
}
