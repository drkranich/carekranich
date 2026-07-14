import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/telemedicine")({
  component: Telemedicine,
});

function Telemedicine() {
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [checklistDone, setChecklistDone] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [summaryApproved, setSummaryApproved] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(upcomingAppointments[0]);

  return (
    <>
      <PageHeader
        title="Telemedicine"
        subtitle="Live consultation - Dr. Joana Costa - Cardiology"
        action={
          <Pill tone="wine">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-wine" />
            Recording - encrypted
          </Pill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video call */}
        <Card className="lg:col-span-2 overflow-hidden" padded={false}>
          <div className="relative aspect-video bg-gradient-olive">
            {/* Doctor video placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-ivory/10 backdrop-blur-sm">
                <Avatar name="Joana Costa" tone="wine" size={96} />
              </div>
            </div>
            {/* Self */}
            <div className="absolute bottom-5 right-5 h-32 w-48 overflow-hidden rounded-2xl border border-ivory/20 bg-foreground/30 backdrop-blur-md">
              <div className="flex h-full items-center justify-center">
                <Avatar name="Maria Lopes" tone="terracotta" size={56} />
              </div>
            </div>
            {/* Top info */}
            <div className="absolute left-5 top-5 flex items-center gap-3 rounded-full bg-foreground/30 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-moss" />
              <span className="text-xs text-ivory">Live - 12:34</span>
            </div>
            {/* Controls */}
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-foreground/40 p-2 backdrop-blur-md">
              {callControls.map((control, i) => {
                const active =
                  (control.label === "Mute" && muted) ||
                  (control.label === "Camera" && !cameraOn) ||
                  (control.label === "Checklist" && checklistDone) ||
                  (control.label === "End" && callEnded);
                return (
                  <button
                    key={control.label}
                    onClick={() => {
                      if (control.label === "Mute") setMuted((value) => !value);
                      if (control.label === "Camera") setCameraOn((value) => !value);
                      if (control.label === "Checklist") setChecklistDone((value) => !value);
                      if (control.label === "End") setCallEnded((value) => !value);
                    }}
                    title={control.label}
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      i === 3 || active
                        ? "bg-wine text-ivory"
                        : "bg-ivory/15 text-ivory hover:bg-ivory/25"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d={control.icon} />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            {[
              { l: "Heart rate", v: "74 bpm" },
              { l: "BP", v: "120/78" },
              { l: "Oxygen", v: "97%" },
              { l: "Temp", v: "36.5 deg C" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-xs uppercase text-muted-foreground">{s.l}</p>
                <p className="mt-1 text-xl font-semibold text-olive">{s.v}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Live transcript */}
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Live transcript - AI</p>
            <Pill tone="moss">PT-PT</Pill>
          </div>
          <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
            {[
              {
                who: "Dr. Costa",
                text: "Maria, how have you been feeling since we adjusted the Losartan?",
              },
              { who: "Maria", text: "Much calmer. The little dizziness in the mornings is gone." },
              {
                who: "Dr. Costa",
                text: "Wonderful. Your systolic dropped 14 points - exactly what we wanted.",
              },
              { who: "Maria", text: "And I've been walking in the garden again." },
              { who: "Dr. Costa", text: "Perfect. Let's keep this dose. I'll renew for 90 days." },
              ...(checklistDone
                ? [{ who: "Care Kranich", text: "Medication renewal checklist completed." }]
                : []),
              ...(callEnded
                ? [{ who: "Care Kranich", text: "Call ended. Summary is ready for signature." }]
                : []),
            ].map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl p-3 text-sm ${m.who === "Dr. Costa" ? "bg-wine/10 text-foreground" : "bg-cream/60 text-foreground"}`}
              >
                <p className="text-xs font-medium text-olive">{m.who}</p>
                <p className="mt-1 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">AI clinical summary - drafted</p>
            <button
              onClick={() => setSummaryApproved((value) => !value)}
              className="rounded-full bg-olive px-4 py-2 text-xs text-ivory"
            >
              {summaryApproved ? "Signed" : "Approve & sign"}
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-border/60 bg-cream/40 p-5 text-sm leading-relaxed text-foreground/90">
            <p>
              <strong className="text-olive">Subjective:</strong> Patient reports significant
              improvement since Losartan adjustment. Morning dizziness resolved. Resumed daily
              garden walks.
            </p>
            <p className="mt-3">
              <strong className="text-olive">Objective:</strong> BP 120/78 (down 14 systolic over 8
              weeks), HR 74, SpO2 97%, T 36.5 deg C. Adherence 98%.
            </p>
            <p className="mt-3">
              <strong className="text-olive">Assessment:</strong> Hypertension well-controlled on
              current regimen. No interactions detected. Frailty index improving.
            </p>
            <p className="mt-3">
              <strong className="text-olive">Plan:</strong> Continue Losartan 50mg + Atorvastatin
              20mg. Renew prescriptions x 90 days. Follow-up in 6 weeks. Encourage continued
              mobility.
            </p>
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Upcoming appointments</p>
          <div className="mt-4 space-y-3">
            {upcomingAppointments.map((a) => (
              <div
                key={a.d}
                onClick={() => setSelectedAppointment(a)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                  selectedAppointment.d === a.d
                    ? "border-olive/50 bg-olive/10"
                    : "border-border/60 bg-cream/40 hover:bg-cream/70"
                }`}
              >
                <div className="font-display text-xs text-olive w-20">{a.d}</div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{a.t}</p>
                  <p className="text-xs text-muted-foreground">{a.w}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full rounded-full border border-border bg-ivory px-4 py-2 text-xs text-olive hover:bg-cream">
            Next: {selectedAppointment.t}
          </button>
        </Card>
      </div>
    </>
  );
}

const callControls = [
  { label: "Mute", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" },
  { label: "Camera", icon: "M23 7l-7 5 7 5V7z M14 5H3v14h11V5z" },
  { label: "Checklist", icon: "M9 11l3 3 8-8" },
  { label: "End", icon: "M3 3l18 18" },
];

const upcomingAppointments = [
  { d: "Fri - 10:30", w: "Dr. Costa", t: "Cardiology follow-up" },
  { d: "Mon - 14:00", w: "Dra. Reis", t: "Geropsychology" },
  { d: "Wed - 09:00", w: "Andre F.", t: "Physiotherapy at home" },
];
