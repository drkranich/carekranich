import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";

export const Route = createFileRoute("/app/academy")({ component: Academy });

const modules = [
  { t: "Foundations of elderly care", lvl: "Core", time: "6h", prog: 100, badges: 3 },
  { t: "Dementia & cognitive decline", lvl: "Specialty", time: "8h", prog: 72, badges: 2 },
  { t: "Cardiac event response", lvl: "Critical", time: "4h", prog: 100, badges: 4 },
  { t: "Emotional first aid", lvl: "Wellbeing", time: "3h", prog: 60, badges: 1 },
  { t: "Fall prevention & lifting", lvl: "Mobility", time: "5h", prog: 40, badges: 1 },
  { t: "Care Kranich platform mastery", lvl: "Platform", time: "2h", prog: 100, badges: 2 },
];

const sims = [
  { t: "Cardiac arrest simulation", grade: "A - 96", date: "May 10" },
  { t: "Fall scenario - bathroom", grade: "A - 92", date: "Apr 28" },
  { t: "Difficult family conversation", grade: "B+ - 85", date: "Apr 16" },
];

function Academy() {
  const [activeModule, setActiveModule] = useState(modules.find((m) => m.prog < 100) ?? modules[0]);
  const [lessonStarted, setLessonStarted] = useState(false);
  const nextAction = useMemo(() => {
    if (activeModule.prog === 100) return "Review certificate";
    if (lessonStarted) return "Resume lesson";
    return "Start lesson";
  }, [activeModule, lessonStarted]);

  return (
    <>
      <PageHeader
        title="Caregiver academy"
        subtitle="Microlearning, simulations, certifications - continuous mastery."
        action={<Pill tone="gold">Level 4 - Specialist</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Modules completed" value="14 / 22" tone="olive" />
        <Stat label="Certifications" value="6" sub="3 due within 90d" tone="gold" />
        <Stat label="Simulation avg" value="91" sub="grade A" tone="moss" />
        <Stat label="Hours - year" value="84h" sub="+ 12h this month" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase text-muted-foreground">Learning paths</p>
            <Pill tone="moss">{modules.filter((m) => m.prog === 100).length} certified</Pill>
          </div>
          <div className="mt-4 space-y-3">
            {modules.map((m) => (
              <button
                key={m.t}
                onClick={() => {
                  setActiveModule(m);
                  setLessonStarted(false);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  activeModule.t === m.t
                    ? "border-olive/35 bg-white/70 shadow-soft"
                    : "border-border bg-cream/40 hover:border-olive/25 hover:bg-white/55"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{m.t}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.lvl} - {m.time} - {m.badges} badges
                    </p>
                  </div>
                  <Pill tone={m.prog === 100 ? "moss" : "gold"}>
                    {m.prog === 100 ? "Complete" : `${m.prog}%`}
                  </Pill>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-olive transition-all"
                    style={{ width: `${m.prog}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-gradient-olive text-ivory border-none">
            <p className="text-xs uppercase text-ivory/70">AI training assistant</p>
            <p className="mt-2 text-lg font-semibold">
              "{activeModule.t} is queued. The assistant will adapt the next drill to your last
              simulation score."
            </p>
            <div className="mt-3 rounded-2xl bg-white/12 p-3 text-sm text-ivory/85">
              <p>{activeModule.lvl} track</p>
              <p>{activeModule.time} expected time</p>
              <p>{activeModule.badges} badges available</p>
            </div>
            <button
              onClick={() => setLessonStarted(true)}
              className="mt-3 rounded-full bg-ivory px-3 py-1.5 text-xs text-olive"
            >
              {nextAction}
            </button>
            {lessonStarted && (
              <p className="mt-2 text-xs text-ivory/75">Lesson live in focus mode.</p>
            )}
          </Card>

          <Card>
            <p className="text-xs uppercase text-muted-foreground">Recent simulations</p>
            <ul className="mt-3 space-y-2 text-sm">
              {sims.map((s) => (
                <li key={s.t} className="rounded-xl border border-border/60 bg-cream/40 p-3">
                  <p className="font-medium text-foreground">{s.t}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.date} - <span className="text-moss">{s.grade}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="text-xs uppercase text-muted-foreground">Earned badges</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "First Responder",
                "Dementia Care",
                "Family Whisperer",
                "Night Shift",
                "Cardiac",
                "100h Club",
              ].map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold"
                >
                  star {b}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
