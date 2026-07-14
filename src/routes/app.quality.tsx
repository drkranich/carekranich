import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, Pill, Stat, Ring, Avatar, Spark } from "@/components/app/primitives";

export const Route = createFileRoute("/app/quality")({ component: Quality });

const caregivers = [
  {
    n: "Sofia Mendes",
    tone: "terracotta",
    role: "Senior - Cardiac specialty",
    punctuality: 98,
    adherence: 96,
    family: 4.9,
    incidents: 0,
    burnout: "Low",
    trend: [88, 91, 92, 94, 95, 96, 98],
  },
  {
    n: "Andre Pinto",
    tone: "olive",
    role: "Mobility specialist",
    punctuality: 92,
    adherence: 89,
    family: 4.7,
    incidents: 1,
    burnout: "Low",
    trend: [80, 82, 85, 87, 88, 90, 92],
  },
  {
    n: "Carla Nunes",
    tone: "wine",
    role: "Dementia care",
    punctuality: 84,
    adherence: 88,
    family: 4.6,
    incidents: 2,
    burnout: "Medium",
    trend: [90, 88, 86, 85, 84, 84, 84],
  },
  {
    n: "Rui Saldanha",
    tone: "gold",
    role: "Night shift lead",
    punctuality: 96,
    adherence: 94,
    family: 4.8,
    incidents: 0,
    burnout: "Low",
    trend: [85, 88, 90, 92, 93, 95, 96],
  },
];

function Quality() {
  const [selectedCaregiver, setSelectedCaregiver] = useState(caregivers[0]);
  const [supportMode, setSupportMode] = useState<"cohort" | "playbook">("cohort");
  const [enabledBadges, setEnabledBadges] = useState<string[]>(qualityBadges);

  return (
    <>
      <PageHeader
        title="Caregiver quality"
        subtitle="Reliability, adherence, family satisfaction, and wellbeing - measured kindly."
        action={<Pill tone="moss">Organization avg 4.8 / 5</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Active caregivers" value="312" sub="14 on leave" tone="olive" />
        <Stat label="Avg punctuality" value="94%" sub="+2 vs last month" tone="moss" />
        <Stat label="Family satisfaction" value="4.8" sub="of 5 - n=1,284" tone="gold" />
        <Stat label="Burnout watch" value="9" sub="proactive support engaged" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6">
        <Card className="p-0">
          <div className="border-b border-border/60 px-6 py-4">
            <p className="text-xs uppercase text-muted-foreground">Caregiver scorecards - live</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-6 py-3 text-left">Caregiver</th>
                  <th className="px-4 py-3 text-left">Punctuality</th>
                  <th className="px-4 py-3 text-left">Adherence</th>
                  <th className="px-4 py-3 text-left">Family rating</th>
                  <th className="px-4 py-3 text-left">Incidents - 90d</th>
                  <th className="px-4 py-3 text-left">Burnout</th>
                  <th className="px-4 py-3 text-left w-32">Trend</th>
                </tr>
              </thead>
              <tbody>
                {caregivers.map((c) => (
                  <tr
                    key={c.n}
                    onClick={() => setSelectedCaregiver(c)}
                    className={`cursor-pointer border-b border-border/60 transition ${
                      selectedCaregiver.n === c.n ? "bg-olive/10" : "hover:bg-cream/40"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.n} tone={c.tone} />
                        <div>
                          <p className="font-medium text-foreground">{c.n}</p>
                          <p className="text-xs text-muted-foreground">{c.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-lg font-semibold">{c.punctuality}%</td>
                    <td className="px-4 py-4 text-lg font-semibold">{c.adherence}%</td>
                    <td className="px-4 py-4">
                      <span className="text-lg font-semibold">{c.family}</span>
                      <span className="text-xs text-muted-foreground"> /5</span>
                    </td>
                    <td className="px-4 py-4">{c.incidents}</td>
                    <td className="px-4 py-4">
                      <Pill
                        tone={
                          c.burnout === "Low" ? "moss" : c.burnout === "Medium" ? "gold" : "wine"
                        }
                      >
                        {c.burnout}
                      </Pill>
                    </td>
                    <td className="px-4 py-4">
                      <Spark points={c.trend} color="var(--olive)" height={30} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Caregiver in focus</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">{selectedCaregiver.n}</h3>
              <p className="text-sm text-muted-foreground">{selectedCaregiver.role}</p>
            </div>
            <Pill tone={selectedCaregiver.burnout === "Low" ? "moss" : "gold"}>
              Burnout {selectedCaregiver.burnout}
            </Pill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-cream/40 p-4">
              <p className="text-xs text-muted-foreground">Punctuality</p>
              <p className="mt-1 text-2xl font-semibold text-olive">
                {selectedCaregiver.punctuality}%
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-cream/40 p-4">
              <p className="text-xs text-muted-foreground">Adherence</p>
              <p className="mt-1 text-2xl font-semibold text-olive">
                {selectedCaregiver.adherence}%
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-cream/40 p-4">
              <p className="text-xs text-muted-foreground">Family rating</p>
              <p className="mt-1 text-2xl font-semibold text-gold">{selectedCaregiver.family}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-cream/40 p-4">
              <p className="text-xs text-muted-foreground">90d incidents</p>
              <p className="mt-1 text-2xl font-semibold text-wine">{selectedCaregiver.incidents}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <Ring value={94} label="Org punctuality" sub="30-day rolling" color="var(--olive)" />
          </Card>
          <Card>
            <Ring
              value={92}
              label="Care plan adherence"
              sub="across all residents"
              color="var(--moss)"
            />
          </Card>
          <Card>
            <Ring
              value={96}
              label="Verified certifications"
              sub="auto-renewed"
              color="var(--gold)"
            />
          </Card>

          <Card className="lg:col-span-2 bg-gradient-wine text-ivory border-none">
            <p className="text-xs uppercase text-ivory/70">Burnout intelligence</p>
            <p className="mt-2 text-xl font-semibold">9 caregivers showing early fatigue signals</p>
            <p className="mt-2 text-sm text-ivory/85">
              Care Kranich detected reduced response variability, longer shift overruns and quieter
              chat tone. Proactive 1:1 support already scheduled with each of them.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSupportMode("cohort")}
                className={`rounded-full px-4 py-2 text-xs ${
                  supportMode === "cohort" ? "bg-ivory text-wine" : "border border-ivory/30"
                }`}
              >
                View cohort
              </button>
              <button
                onClick={() => setSupportMode("playbook")}
                className={`rounded-full px-4 py-2 text-xs ${
                  supportMode === "playbook" ? "bg-ivory text-wine" : "border border-ivory/30"
                }`}
              >
                Wellbeing playbook
              </button>
            </div>
            <p className="mt-3 text-xs text-ivory/75">
              {supportMode === "cohort"
                ? "Showing the 9-person fatigue cohort with scheduled support windows."
                : "Playbook loaded: shorter shifts, quieter notifications, supervisor check-ins."}
            </p>
          </Card>

          <Card>
            <p className="text-xs uppercase text-muted-foreground">Reputation badges</p>
            <ul className="mt-3 space-y-2 text-sm">
              {qualityBadges.map((b) => (
                <li
                  key={b}
                  onClick={() =>
                    setEnabledBadges((items) =>
                      items.includes(b) ? items.filter((item) => item !== b) : [...items, b],
                    )
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-cream/50"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      enabledBadges.includes(b) ? "bg-moss" : "bg-muted"
                    }`}
                  />{" "}
                  {b}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

const qualityBadges = [
  "Verified ID",
  "Background checked",
  "First responder",
  "Dementia certified",
  "Family-rated 4.9+",
];
