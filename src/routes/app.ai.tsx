import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, Pill, Spark, Stat } from "@/components/app/primitives";

export const Route = createFileRoute("/app/ai")({
  component: AIInsights,
});

function AIInsights() {
  const [selectedAlert, setSelectedAlert] = useState(predictiveAlerts[0]);
  const [resolvedActions, setResolvedActions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState(initialConversation);

  const sendMessage = () => {
    const clean = message.trim();
    if (!clean) return;
    setConversation((items) => [
      ...items,
      { who: "Maria", text: clean, tone: "moss" as const },
      {
        who: "Care Kranich",
        text: "I captured that and connected it to today's emotional pattern.",
        tone: "wine" as const,
      },
    ]);
    setMessage("");
  };

  return (
    <>
      <PageHeader
        title="Care Kranich Intelligence"
        subtitle="Predictive healthcare AI - trained on 4.2M elder-days"
        action={<Pill tone="wine">Confidence 94%</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Health trajectory" value="up Stable" sub="90-day forecast" tone="moss" />
        <Stat label="Hospitalization risk" value="3.2%" sub="down from 5.1%" tone="moss" />
        <Stat label="Cognitive index" value="0.86" sub="No decline detected" tone="olive" />
        <Stat label="Emotional index" value="0.78" sub="up from 0.71" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Predictive alerts</p>
            <Pill tone="moss">3 active - 0 critical</Pill>
          </div>
          <div className="mt-5 space-y-4">
            {predictiveAlerts.map((a) => {
              const isSelected = selectedAlert.t === a.t;
              const isDone = resolvedActions.includes(a.t);
              return (
                <div
                  key={a.t}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedAlert(a)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setSelectedAlert(a);
                  }}
                  className={`w-full rounded-2xl border p-5 text-left transition ${
                    isSelected
                      ? "border-olive/50 bg-olive/10 shadow-soft"
                      : "border-border/60 bg-cream/40 hover:border-olive/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-foreground">{a.t}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{a.n}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setResolvedActions((items) =>
                          items.includes(a.t)
                            ? items.filter((item) => item !== a.t)
                            : [...items, a.t],
                        );
                        setSelectedAlert(a);
                      }}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs ${
                        isDone ? "bg-moss/15 text-moss" : "bg-olive text-ivory"
                      }`}
                    >
                      {isDone ? "Queued" : a.action}
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${a.c}%`, background: `var(--${a.tone})` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {a.c}% confidence
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-olive/20 bg-olive/10 p-4">
            <p className="text-xs uppercase text-muted-foreground">AI recommendation selected</p>
            <p className="mt-1 text-sm font-medium text-foreground">{selectedAlert.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{selectedAlert.recommendation}</p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-wine text-ivory">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Care Kranich Companion</p>
              <p className="text-xs text-muted-foreground">Conversational emotional AI</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 max-h-96 overflow-y-auto pr-1">
            {conversation.map((item, index) => (
              <Bubble key={`${item.who}-${index}`} who={item.who} tone={item.tone}>
                {item.text}
              </Bubble>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2 rounded-full border border-border bg-ivory p-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Speak or write to Care Kranich..."
              className="flex-1 bg-transparent px-3 text-sm focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send message"
              title="Send message"
              className="rounded-full bg-wine p-2 text-ivory"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </button>
          </form>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">
              Trend forecasting - next 90 days
            </p>
            <div className="flex gap-2 text-xs">
              <Legend color="var(--olive)" label="Cardiovascular" />
              <Legend color="var(--wine)" label="Emotional" />
              <Legend color="var(--gold)" label="Cognitive" />
              <Legend color="var(--terracotta)" label="Mobility" />
            </div>
          </div>
          <div className="mt-6 space-y-5">
            {[
              {
                l: "Cardiovascular",
                c: "var(--olive)",
                d: [62, 64, 68, 70, 73, 76, 78, 82, 85, 88, 90, 92],
              },
              {
                l: "Emotional wellbeing",
                c: "var(--wine)",
                d: [60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 79, 80],
              },
              {
                l: "Cognitive",
                c: "var(--gold)",
                d: [80, 82, 82, 84, 84, 86, 86, 86, 88, 88, 88, 86],
              },
              {
                l: "Mobility",
                c: "var(--terracotta)",
                d: [50, 54, 58, 60, 64, 68, 72, 74, 78, 80, 82, 84],
              },
            ].map((v) => (
              <div key={v.l}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-foreground">{v.l}</span>
                  <span className="text-muted-foreground tabular-nums">{v.d[v.d.length - 1]}</span>
                </div>
                <Spark points={v.d} color={v.c} height={32} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

const predictiveAlerts = [
  {
    t: "Hydration risk - medium",
    n: "Pattern of low afternoon fluid intake. AI recommends gentle reminders at 14:30 and 17:00.",
    c: 78,
    tone: "gold",
    action: "Schedule reminders",
    recommendation: "Create two gentle reminders and ask Sofia to verify intake at the next visit.",
  },
  {
    t: "Sleep regularity - low risk",
    n: "Bedtime drift of 38 min over the past week. Consider winding down rituals.",
    c: 64,
    tone: "moss",
    action: "Suggest routine",
    recommendation: "Send a 21:15 wind-down checklist and lower smart-home lighting at 21:30.",
  },
  {
    t: "Social connection - improving",
    n: "Video calls increased 40% - emotional sentiment up. Maintain current cadence.",
    c: 92,
    tone: "wine",
    action: "Send to family",
    recommendation: "Share the positive trend with family and protect two call windows this week.",
  },
];

const initialConversation = [
  { who: "Maria", text: "Sometimes I miss the old garden in Coimbra.", tone: "moss" as const },
  {
    who: "Care Kranich",
    text: "That sounds like such a beautiful memory. What did you grow there?",
    tone: "wine" as const,
  },
  { who: "Maria", text: "My father's roses. Reds and yellows.", tone: "moss" as const },
  {
    who: "Care Kranich",
    text: "Roses. That love seems to have stayed in your hands - Sofia mentioned the tulips Helena brought today look perfectly arranged.",
    tone: "wine" as const,
  },
  { who: "Maria", text: "Helena is kind.", tone: "moss" as const },
  {
    who: "Care Kranich",
    text: "She is. Would you like me to schedule a little tea with her this week?",
    tone: "wine" as const,
  },
];

function Bubble({
  who,
  children,
  tone = "moss",
}: {
  who: string;
  children: React.ReactNode;
  tone?: "moss" | "wine";
}) {
  const cls = tone === "wine" ? "bg-wine/10 text-foreground" : "bg-cream text-foreground";
  return (
    <div className={`rounded-2xl p-3 ${cls}`}>
      <p className="text-xs font-medium text-olive">{who}</p>
      <p className="mt-1 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-foreground">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
