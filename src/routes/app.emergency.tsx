import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/emergency")({
  component: Emergency,
});

function Emergency() {
  const [sosStage, setSosStage] = useState<"ready" | "armed" | "sent">("ready");
  const [selectedContact, setSelectedContact] = useState(emergencyContacts[0]);
  const [contacted, setContacted] = useState<string[]>([]);

  return (
    <>
      <PageHeader
        title="Emergency center"
        subtitle="One tap reaches caregiver, family, neighbor and 112."
        action={
          <Pill tone={sosStage === "sent" ? "wine" : "moss"}>
            {sosStage === "sent" ? "Escalation active" : "All systems armed"}
          </Pill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-gradient-wine text-ivory border-none">
          <p className="text-xs uppercase text-ivory/70">Trigger emergency response</p>
          <h2 className="mt-2 text-3xl font-semibold">
            {sosStage === "sent" ? "SOS chain in progress" : "SOS - instant escalation"}
          </h2>
          <p className="mt-3 max-w-md text-sm text-ivory/80">
            {sosStage === "sent"
              ? "Maria's location, vitals and care plan were packaged for the responder chain."
              : "Press and hold for 3 seconds to activate the full chain. Maria's location, vitals and care plan are sent to every responder simultaneously."}
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() =>
                setSosStage((stage) =>
                  stage === "ready" ? "armed" : stage === "armed" ? "sent" : "ready",
                )
              }
              className={`group relative flex h-40 w-40 items-center justify-center rounded-full shadow-elevated transition hover:scale-105 ${
                sosStage === "armed" ? "bg-gold text-foreground" : "bg-ivory text-wine"
              }`}
            >
              <span className="absolute inset-0 animate-pulse-soft rounded-full bg-ivory/40" />
              <div className="relative text-center">
                <svg
                  viewBox="0 0 24 24"
                  className="mx-auto h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L1 21h22L12 2z M12 9v4 M12 17h.01" />
                </svg>
                <p className="mt-2 text-lg font-semibold">
                  {sosStage === "ready" ? "Arm SOS" : sosStage === "armed" ? "Send now" : "Reset"}
                </p>
              </div>
            </button>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Response chain</p>
          <ol className="mt-4 space-y-4">
            {responseChain.map((s) => (
              <li key={s.i} className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-olive font-display text-xs text-ivory">
                  {s.i}
                </span>
                <div>
                  <p className="text-sm text-foreground">{s.t}</p>
                  <p className="text-xs text-muted-foreground">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="lg:col-span-3">
          <p className="text-xs uppercase text-muted-foreground">Emergency contacts</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {emergencyContacts.map((c) => (
              <div
                key={c.n}
                onClick={() => setSelectedContact(c)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  selectedContact.n === c.n
                    ? "border-olive/50 bg-olive/10"
                    : "border-border bg-cream/40 hover:bg-cream/70"
                }`}
              >
                <Avatar name={c.n} tone={c.tone} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.n}</p>
                  <p className="text-xs text-muted-foreground">{c.r}</p>
                  <p className="text-xs text-olive">{c.p}</p>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedContact(c);
                    setContacted((items) => (items.includes(c.n) ? items : [...items, c.n]));
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    contacted.includes(c.n) ? "bg-moss text-ivory" : "bg-olive text-ivory"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-olive/20 bg-olive/10 p-4">
            <p className="text-xs uppercase text-muted-foreground">Selected responder</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {selectedContact.n} - {selectedContact.r}
            </p>
            <p className="text-xs text-muted-foreground">
              {contacted.includes(selectedContact.n)
                ? "Call logged and pinned to this emergency workspace."
                : "Ready to call or include in the escalation chain."}
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Recent events - last 30 days</p>
            <Pill tone="moss">No emergencies</Pill>
          </div>
          <ul className="mt-4 divide-y divide-border/60">
            {[
              {
                d: "Apr 28",
                t: "Soft alert - low hydration trend",
                r: "Resolved by Sofia - 12 min",
              },
              { d: "Apr 12", t: "Night-time wake event", r: "Self-resolved - returned to sleep" },
              {
                d: "Mar 30",
                t: "BP spike alert",
                r: "Telemed with Dr. Costa - medication adjusted",
              },
            ].map((e) => (
              <li key={e.d} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-foreground">{e.t}</p>
                  <p className="text-xs text-muted-foreground">{e.r}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{e.d}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

const responseChain = [
  { i: 1, t: "Sofia Mendes - caregiver", d: "On site - 0s" },
  { i: 2, t: "Ines Ribeiro - daughter", d: "Notified - ~10s" },
  { i: 3, t: "Helena - neighbor", d: "Notified - ~10s" },
  { i: 4, t: "Dr. Costa - telemedicine", d: "Auto-call - ~30s" },
  { i: 5, t: "112 emergency services", d: "Auto-dispatch - ~45s" },
];

const emergencyContacts = [
  { n: "Sofia Mendes", r: "Caregiver", p: "+351 91 --- --12", tone: "terracotta" },
  { n: "Ines Ribeiro", r: "Daughter", p: "+351 96 --- --44", tone: "wine" },
  { n: "Helena Branco", r: "Neighbor", p: "+351 92 --- --08", tone: "gold" },
  { n: "Dr. Joana Costa", r: "Cardiologist", p: "+351 21 --- --90", tone: "olive" },
];
