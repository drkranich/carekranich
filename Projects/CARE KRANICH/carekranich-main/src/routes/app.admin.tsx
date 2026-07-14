import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Spark, Bars, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/admin")({
  component: Admin,
});

function Admin() {
  const { isSuperAdmin, loading } = useAuth();
  if (loading) return <p className="text-sm text-muted-foreground">Loadingâ€¦</p>;
  if (!isSuperAdmin) return <Navigate to="/app" />;
  return (
    <>
      <PageHeader
        title="Executive command center"
        subtitle="Care Kranich Â· Q2 2026 Â· Live"
        action={<div className="flex gap-2"><Pill tone="moss"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-moss"/>All systems healthy</Pill><button className="rounded-full bg-olive px-4 py-2 text-xs text-ivory">Export brief</button></div>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="MRR" value="â‚¬842K" sub="â–² 14.2% MoM" tone="olive" />
        <Stat label="ARR" value="â‚¬10.1M" sub="On pace Â· â‚¬14M FY" tone="wine" />
        <Stat label="Net retention" value="118%" sub="Best-in-class" tone="moss" />
        <Stat label="Active lives" value="12,418" sub="+892 this month" tone="gold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Revenue Â· trailing 12 months</p>
              <h3 className="mt-1 font-display text-2xl text-foreground">â‚¬7.2M trailing</h3>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-foreground"><span className="h-2 w-2 rounded-sm bg-olive"/>Subscriptions</span>
              <span className="flex items-center gap-1.5 text-foreground"><span className="h-2 w-2 rounded-sm bg-wine"/>Marketplace</span>
            </div>
          </div>
          <div className="mt-6">
            <Bars values={[420,460,510,540,580,620,640,690,720,760,800,842]} color="var(--olive)" height={140} />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              {["J","J","A","S","O","N","D","J","F","M","A","M"].map((m,i)=><span key={i}>{m}</span>)}
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Subscription mix</p>
          <div className="mt-4 space-y-4">
            {[
              { l: "Enterprise (clinics)", v: 58, c: "var(--olive)" },
              { l: "Care Home", v: 26, c: "var(--wine)" },
              { l: "Family", v: 14, c: "var(--gold)" },
              { l: "Insurance partners", v: 2, c: "var(--terracotta)" },
            ].map((s) => (
              <div key={s.l}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-foreground">{s.l}</span><span className="text-muted-foreground">{s.v}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${s.v}%`, background: s.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
            <div><p className="text-muted-foreground">LTV</p><p className="font-display text-xl text-olive">â‚¬8,420</p></div>
            <div><p className="text-muted-foreground">CAC</p><p className="font-display text-xl text-olive">â‚¬640</p></div>
            <div><p className="text-muted-foreground">Payback</p><p className="font-display text-xl text-olive">7.2 mo</p></div>
            <div><p className="text-muted-foreground">Churn</p><p className="font-display text-xl text-wine">1.8%</p></div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Marketplace operations</p>
            <Pill tone="moss">+12% bookings</Pill>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border"><th className="py-2 text-left font-medium">Provider</th><th className="text-left font-medium">Type</th><th className="text-left font-medium">Bookings</th><th className="text-left font-medium">Rating</th><th className="text-right font-medium">Payout</th></tr>
            </thead>
            <tbody>
              {[
                { n: "Sofia Mendes", t: "Caregiver", b: 142, r: "4.9", p: "â‚¬2,840" },
                { n: "Vita Care Clinic", t: "Clinic", b: 98, r: "4.8", p: "â‚¬18,420" },
                { n: "Dr. Costa", t: "Telemed", b: 64, r: "5.0", p: "â‚¬6,240" },
                { n: "PhysioStudio", t: "Therapy", b: 52, r: "4.7", p: "â‚¬4,160" },
                { n: "PharmaPlus", t: "Pharmacy", b: 240, r: "4.9", p: "â‚¬8,800" },
              ].map((p) => (
                <tr key={p.n} className="border-b border-border/40 last:border-0">
                  <td className="py-3 text-foreground">{p.n}</td>
                  <td className="text-muted-foreground">{p.t}</td>
                  <td className="text-muted-foreground tabular-nums">{p.b}</td>
                  <td><Pill tone="gold">â˜… {p.r}</Pill></td>
                  <td className="text-right font-display text-olive tabular-nums">{p.p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI usage Â· 30 days</p>
          <div className="mt-3"><Spark points={[40,52,48,60,72,68,80,76,90,88,96,104,108,118,124]} color="var(--wine)" height={60} /></div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tokens</span><span className="font-display text-foreground">42.8M</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">AI cost</span><span className="font-display text-foreground">â‚¬1,820</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quality (avg)</span><span className="font-display text-moss">4.86/5</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Letters sent</span><span className="font-display text-foreground">12,418</span></div>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Geographic activity Â· last 24h</p>
            <Pill tone="terracotta">3 priority regions</Pill>
          </div>
          <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2">
            {Array.from({length:24}).map((_,i) => {
              const intensity = Math.floor(Math.random()*5);
              const palette = ["bg-olive/5","bg-olive/15","bg-olive/30","bg-wine/40","bg-wine/60"];
              return <div key={i} className={`aspect-square rounded-xl ${palette[intensity]} flex items-end p-2`}>
                <span className="text-[10px] text-foreground/60">{["LIS","PRT","BCN","MAD","PAR","BER","MIL","ROM","AMS","ZRH","STO","LON","DUB","CPH","HEL","OSL","WAW","VIE","ATH","BRX","LUX","NAP","CGN","FRA"][i]}</span>
              </div>;
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
