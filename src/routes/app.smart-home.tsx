import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";

export const Route = createFileRoute("/app/smart-home")({
  component: SmartHome,
});

const rooms = [
  {
    name: "Bedroom",
    x: 0,
    y: 0,
    w: 2,
    h: 2,
    status: "Resting - 22 deg C",
    tone: "moss",
    active: false,
  },
  { name: "Bathroom", x: 2, y: 0, w: 1, h: 2, status: "Quiet", tone: "muted", active: false },
  {
    name: "Living room",
    x: 0,
    y: 2,
    w: 2,
    h: 2,
    status: "Maria here - reading",
    tone: "wine",
    active: true,
  },
  { name: "Kitchen", x: 2, y: 2, w: 2, h: 1, status: "Stove off", tone: "moss", active: false },
  { name: "Garden", x: 2, y: 3, w: 2, h: 1, status: "Sensor active", tone: "gold", active: false },
  {
    name: "Hall",
    x: 3,
    y: 0,
    w: 1,
    h: 2,
    status: "Front door locked",
    tone: "moss",
    active: false,
  },
];

function SmartHome() {
  const [selectedRoom, setSelectedRoom] = useState(rooms.find((room) => room.active) ?? rooms[0]);
  const [guardMode, setGuardMode] = useState<"Home" | "Night" | "Away">("Home");

  return (
    <>
      <PageHeader
        title="Home guardianship"
        subtitle="Maria's home - 6 rooms - 14 sensors - 2 wearables"
        action={<Pill tone="moss">Safety score 96/100</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Movement" value="Normal" sub="Last: 3 min ago" tone="moss" />
        <Stat label="Air quality" value="Excellent" sub="CO2 480 ppm" tone="moss" />
        <Stat label="Temperature" value="22.4 deg C" sub="Stable" tone="gold" />
        <Stat label="Door status" value="Secure" sub="Locked since 21:14" tone="olive" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-xs uppercase text-muted-foreground">Live floor plan</p>
          <div
            className="mt-4 grid grid-cols-4 grid-rows-4 gap-2 rounded-2xl bg-cream/40 p-4"
            style={{ aspectRatio: "4/3.5" }}
          >
            {rooms.map((r) => (
              <button
                key={r.name}
                onClick={() => setSelectedRoom(r)}
                className={`relative rounded-2xl border p-3 text-left transition ${
                  selectedRoom.name === r.name
                    ? "border-baby/70 bg-baby/20 shadow-soft"
                    : r.active
                      ? "border-wine bg-wine/10 shadow-soft"
                      : "border-border bg-card"
                }`}
                style={{
                  gridColumn: `${r.x + 1} / span ${r.w}`,
                  gridRow: `${r.y + 1} / span ${r.h}`,
                }}
              >
                <p className="text-xs font-medium text-foreground">{r.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{r.status}</p>
                {r.active && (
                  <span className="absolute right-3 top-3 flex h-3 w-3 items-center justify-center">
                    <span className="absolute h-3 w-3 animate-pulse-soft rounded-full bg-wine/40" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-wine" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 rounded-2xl border border-baby/40 bg-baby/20 p-4">
            <p className="text-xs uppercase text-muted-foreground">Selected room</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{selectedRoom.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedRoom.status}</p>
          </div>
          <div className="mb-4 flex gap-2">
            {(["Home", "Night", "Away"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setGuardMode(mode)}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  guardMode === mode ? "bg-olive text-ivory" : "border border-border bg-white/55"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="mb-4 rounded-2xl border border-olive/20 bg-olive/10 p-3 text-sm text-foreground">
            Guard mode: <span className="font-semibold">{guardMode}</span>
          </p>
          <p className="text-xs uppercase text-muted-foreground">Connected devices</p>
          <ul className="mt-4 space-y-3">
            {[
              { d: "Apple Watch - Maria", s: "Connected - 92%", t: "moss" },
              { d: "Withings BP monitor", s: "Last reading 09:00", t: "olive" },
              { d: "Glucose patch (Dexcom)", s: "Continuous - streaming", t: "gold" },
              { d: "Bedroom motion sensor", s: "Calibrated", t: "moss" },
              { d: "Stove guard", s: "Armed", t: "moss" },
              { d: "Front door lock", s: "Secure", t: "olive" },
              { d: "Medication dispenser", s: "Next: 16:00", t: "wine" },
            ].map((d) => (
              <li
                key={d.d}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-cream/40 p-3"
              >
                <div>
                  <p className="text-sm text-foreground">{d.d}</p>
                  <p className="text-xs text-muted-foreground">{d.s}</p>
                </div>
                <Pill tone={d.t as any}>-</Pill>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <p className="text-xs uppercase text-muted-foreground">
            Behavioral pattern - last 7 nights
          </p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">
            Nighttime stability - improving
          </h3>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {[
              { d: "Wed", e: 1 },
              { d: "Thu", e: 0 },
              { d: "Fri", e: 2 },
              { d: "Sat", e: 0 },
              { d: "Sun", e: 1 },
              { d: "Mon", e: 0 },
              { d: "Tue", e: 0 },
            ].map((n) => (
              <div
                key={n.d}
                className="rounded-2xl border border-border bg-cream/40 p-4 text-center"
              >
                <p className="text-xs text-muted-foreground">{n.d}</p>
                <p className="mt-2 text-2xl font-semibold text-olive">{n.e}</p>
                <p className="text-[10px] text-muted-foreground">night events</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
