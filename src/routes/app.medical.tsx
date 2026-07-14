import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill, Spark, Avatar, Stat } from "@/components/app/primitives";

export const Route = createFileRoute("/app/medical")({
  component: Medical,
});

function Medical() {
  return (
    <>
      <PageHeader
        title="Clinical workspace"
        subtitle="Maria Lopes - F - 82 - Hypertension, mild osteoarthritis"
        action={
          <div className="flex gap-2">
            <Pill tone="moss">Stable</Pill>
            <button className="rounded-full bg-olive px-4 py-2 text-xs text-ivory">
              + New note
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Hospitalization risk" value="Low" sub="3.2% - 90 days" tone="moss" />
        <Stat label="Adherence" value="98%" sub="30-day rolling" tone="olive" />
        <Stat label="Falls (90d)" value="0" sub="Last fall: 2024" tone="gold" />
        <Stat label="Frailty index" value="0.18" sub="down 0.03 - improving" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Longitudinal vitals - 90 days
              </p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Cardiovascular trend</h3>
            </div>
            <Pill tone="moss">down 8 mmHg systolic</Pill>
          </div>
          <div className="mt-6 space-y-5">
            {[
              {
                l: "Systolic BP (mmHg)",
                c: "var(--wine)",
                d: [142, 138, 140, 135, 132, 130, 128, 124, 122, 120, 118, 118],
              },
              {
                l: "Diastolic BP (mmHg)",
                c: "var(--terracotta)",
                d: [88, 86, 86, 84, 82, 82, 80, 78, 78, 76, 76, 76],
              },
              {
                l: "Resting HR (bpm)",
                c: "var(--olive)",
                d: [78, 76, 77, 76, 74, 75, 73, 73, 72, 72, 71, 72],
              },
              {
                l: "Glucose (mg/dL)",
                c: "var(--gold)",
                d: [112, 118, 116, 110, 108, 106, 104, 108, 105, 104, 102, 104],
              },
            ].map((v) => (
              <div key={v.l}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-foreground">{v.l}</span>
                  <span className="text-muted-foreground tabular-nums">{v.d[v.d.length - 1]}</span>
                </div>
                <Spark points={v.d} color={v.c} height={36} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-wine text-ivory">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M2 12h4 M18 12h4" />
              </svg>
            </div>
            <div>
              <p className="font-display text-sm text-olive">AI clinical assistant</p>
              <p className="text-xs text-muted-foreground">Pattern detection - 3 insights</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {[
              {
                t: "BP improving on Losartan",
                n: "Systolic down 14 mmHg over 8 weeks. Continue current regimen.",
                tone: "moss",
              },
              {
                t: "Mild dehydration pattern",
                n: "Afternoon glucose spikes correlate with low fluid intake.",
                tone: "gold",
              },
              {
                t: "No interactions detected",
                n: "Atorvastatin + Losartan + Vit D - clean profile.",
                tone: "olive",
              },
            ].map((i) => (
              <li key={i.t} className="rounded-2xl border border-border/60 bg-cream/40 p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full bg-${i.tone}`} />
                  <p className="text-sm text-foreground">{i.t}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{i.n}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Active prescriptions</p>
            <button className="text-xs text-olive hover:underline">+ Prescribe</button>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 text-left font-medium">Medication</th>
                <th className="text-left font-medium">Dose</th>
                <th className="text-left font-medium">Schedule</th>
                <th className="text-left font-medium">Adherence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[
                { m: "Atorvastatin", d: "20 mg", s: "1x daily - evening", a: "100%" },
                { m: "Losartan", d: "50 mg", s: "1x daily - morning", a: "98%" },
                { m: "Vitamin D3", d: "1000 IU", s: "1x daily - morning", a: "96%" },
                { m: "Calcium carbonate", d: "500 mg", s: "2x daily", a: "92%" },
              ].map((p) => (
                <tr key={p.m} className="border-b border-border/40 last:border-0">
                  <td className="py-3 text-foreground">{p.m}</td>
                  <td className="text-muted-foreground">{p.d}</td>
                  <td className="text-muted-foreground">{p.s}</td>
                  <td>
                    <Pill tone="moss">{p.a}</Pill>
                  </td>
                  <td className="text-right">
                    <button className="text-xs text-muted-foreground hover:text-olive">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Care team</p>
          <div className="mt-4 space-y-3">
            {[
              { n: "Dr. Joana Costa", r: "Cardiology - lead", tone: "wine" },
              { n: "Dr. Miguel Faria", r: "Geriatrics", tone: "olive" },
              { n: "Sofia Mendes", r: "Primary caregiver", tone: "terracotta" },
              { n: "Ines Ribeiro", r: "Family - daughter", tone: "gold" },
            ].map((p) => (
              <div key={p.n} className="flex items-center gap-3">
                <Avatar name={p.n} tone={p.tone} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{p.n}</p>
                  <p className="text-xs text-muted-foreground">{p.r}</p>
                </div>
                <button className="text-xs text-olive hover:underline">Message</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
