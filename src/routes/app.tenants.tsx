import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Stat, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/tenants")({ component: Tenants });

const tenants = [
  { n: "Familia Lopes", type: "Family", plan: "Family Pro", seats: 6, mrr: "€89", health: 100, brand: "olive" },
  { n: "Casa Serena · Lisboa", type: "Clinic", plan: "Clinic Suite", seats: 84, mrr: "€2,450", health: 98, brand: "wine" },
  { n: "Vida Plena Network", type: "Enterprise", plan: "Enterprise · white-label", seats: 1284, mrr: "€38,200", health: 97, brand: "gold" },
  { n: "Hospital São João", type: "Healthcare group", plan: "Enterprise · custom", seats: 420, mrr: "€12,800", health: 99, brand: "terracotta" },
  { n: "Lar do Sol · Porto", type: "Clinic", plan: "Clinic Suite", seats: 56, mrr: "€1,680", health: 92, brand: "moss" },
];

function Tenants() {
  return (
    <>
      <PageHeader title="Tenants & organizations" subtitle="Families, clinics, networks and enterprise groups — fully isolated, optionally white-labeled." action={<button className="rounded-full bg-olive px-4 py-2 text-sm text-ivory">+ New tenant</button>} />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Active tenants" value="284" sub="+12 this month" tone="olive" />
        <Stat label="Enterprise accounts" value="14" sub="incl. 4 white-label" tone="gold" />
        <Stat label="Total seats" value="12,840" sub="across all tiers" tone="moss" />
        <Stat label="Net retention" value="118%" sub="trailing 12mo" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          <div className="border-b border-border/60 px-6 py-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Tenant directory</p>
          </div>
          <ul className="divide-y divide-border/60">
            {tenants.map((t) => (
              <li key={t.n} className="flex items-center gap-4 px-6 py-4 hover:bg-cream/40">
                <Avatar name={t.n} tone={t.brand} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{t.n}</p>
                  <p className="text-xs text-muted-foreground">{t.type} · {t.plan}</p>
                </div>
                <div className="hidden md:block w-24 text-center"><p className="font-display text-lg">{t.seats}</p><p className="text-[10px] text-muted-foreground uppercase tracking-widest">seats</p></div>
                <div className="hidden md:block w-24 text-center"><p className="font-display text-lg">{t.mrr}</p><p className="text-[10px] text-muted-foreground uppercase tracking-widest">mrr</p></div>
                <Pill tone={t.health > 95 ? "moss" : "gold"}>{t.health}%</Pill>
                <button className="text-xs text-olive hover:underline">Switch →</button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Active context</p>
            <div className="mt-3 rounded-2xl bg-gradient-olive p-4 text-ivory">
              <p className="text-xs text-ivory/70">Currently viewing</p>
              <p className="mt-1 font-display text-xl">Familia Lopes</p>
              <p className="text-xs text-ivory/80">Family · 6 seats · Pro</p>
              <button className="mt-3 rounded-full bg-ivory px-3 py-1.5 text-xs text-olive">Switch tenant</button>
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">White-label</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { o: "Vida Plena", d: "vidaplena.olia.app · custom palette" },
                { o: "Hospital São João", d: "saojoao.olia.app · custom domain" },
              ].map((w) => (
                <li key={w.o} className="rounded-xl border border-border/60 bg-cream/40 p-3">
                  <p className="font-medium text-foreground">{w.o}</p>
                  <p className="text-xs text-muted-foreground">{w.d}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Permissions matrix</p>
            <ul className="mt-3 space-y-1.5 text-xs">
              {[
                ["Owner", "Full access · billing · branding"],
                ["Admin", "Org settings · staff · reports"],
                ["Clinician", "Medical · care plans · alerts"],
                ["Caregiver", "Shifts · tasks · timeline"],
                ["Family", "Read · emotional · timeline"],
              ].map(([r, d]) => (
                <li key={r} className="flex gap-2"><span className="w-20 font-medium text-foreground">{r}</span><span className="text-muted-foreground">{d}</span></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
