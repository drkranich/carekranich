import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, Pill } from "@/components/app/primitives";

export const Route = createFileRoute("/app/workflows")({ component: Workflows });

const workflows = [
  {
    name: "Missed medication â†’ Family escalation",
    cat: "Medication",
    runs: 1248,
    success: 99.2,
    steps: ["Med skipped 15min", "Notify caregiver", "Wait 5min", "Notify family", "Generate AI summary"],
  },
  {
    name: "Abnormal vitals â†’ Telemedicine bridge",
    cat: "Health",
    runs: 412,
    success: 98.5,
    steps: ["Detect anomaly (2 readings)", "Page caregiver", "Open telemed slot", "Doctor joins", "Plan updated"],
  },
  {
    name: "Fall detected â†’ Full emergency chain",
    cat: "Emergency",
    runs: 18,
    success: 100,
    steps: ["IMU + audio confirm", "SOS to caregiver", "Family alerted", "112 dispatched", "Incident report"],
  },
  {
    name: "Emotional withdrawal â†’ Companion intervention",
    cat: "Emotional",
    runs: 86,
    success: 94.1,
    steps: ["Detect 3-day pattern", "Care Kranich companion call", "Notify family gently", "Suggest visit", "Wellness coach"],
  },
];

function Workflows() {
  return (
    <>
      <PageHeader
        title="Care automation"
        subtitle="Visual workflows that orchestrate caregivers, family, AI and emergency services."
        action={<button className="rounded-full bg-olive px-4 py-2 text-sm text-ivory shadow-soft">+ New workflow</button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {workflows.map((w) => (
          <Card key={w.name}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-moss">{w.cat}</p>
                <h3 className="mt-1 font-display text-lg text-foreground">{w.name}</h3>
              </div>
              <Pill tone="moss">Active</Pill>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="flex min-w-max items-center gap-2">
                {w.steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="rounded-2xl border border-border bg-cream/40 px-3 py-2 text-xs text-foreground whitespace-nowrap">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-olive font-display text-[10px] text-ivory">{i + 1}</span>
                      {s}
                    </div>
                    {i < w.steps.length - 1 && <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14 M13 6l6 6-6 6"/></svg>}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <span>{w.runs.toLocaleString()} runs Â· 30d</span>
              <span><span className="text-moss font-display text-sm">{w.success}%</span> success</span>
              <button className="text-olive hover:underline">Open builder â†’</button>
            </div>
          </Card>
        ))}

        <Card className="lg:col-span-2 bg-gradient-olive text-ivory border-none">
          <p className="text-xs uppercase tracking-widest text-ivory/70">AI suggestion</p>
          <h3 className="mt-1 font-display text-2xl">Create a workflow for nighttime restlessness?</h3>
          <p className="mt-2 max-w-2xl text-sm text-ivory/85">Care Kranich detected 7 nights of light fragmentation patterns across 12 residents. A proactive companion + environment routine could reduce wake events by ~34%.</p>
          <div className="mt-4 flex gap-2">
            <button className="rounded-full bg-ivory px-4 py-2 text-xs text-olive">Generate workflow</button>
            <button className="rounded-full border border-ivory/30 px-4 py-2 text-xs">Dismiss</button>
          </div>
        </Card>
      </div>
    </>
  );
}
