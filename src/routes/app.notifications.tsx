import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";

export const Route = createFileRoute("/app/notifications")({ component: Notifications });

const groups = [
  {
    label: "Today",
    items: [
      {
        who: "Sofia Mendes",
        what: "completed morning routine",
        when: "9:24",
        tone: "moss",
        k: "Care",
      },
      {
        who: "Care Kranich AI",
        what: "summarized last night: peaceful, 7h sleep",
        when: "8:02",
        tone: "gold",
        k: "AI",
      },
      {
        who: "Dr. Costa",
        what: "approved prescription renewal",
        when: "11:18",
        tone: "wine",
        k: "Medical",
      },
      {
        who: "Smart home",
        what: "stove guard armed automatically",
        when: "13:40",
        tone: "olive",
        k: "Home",
      },
    ],
  },
  {
    label: "Yesterday",
    items: [
      {
        who: "Tomas",
        what: "video call answered by Maria - 14 min",
        when: "18:22",
        tone: "wine",
        k: "Family",
      },
      {
        who: "Pharmacy",
        what: "delivery confirmed - 3 items",
        when: "10:11",
        tone: "terracotta",
        k: "Ops",
      },
    ],
  },
];

function Notifications() {
  const [filter, setFilter] = useState("All");
  const [channels, setChannels] = useState([
    { c: "In-app", on: true },
    { c: "Push (mobile)", on: true },
    { c: "Email - daily digest", on: true },
    { c: "SMS - emergency only", on: true },
    { c: "WhatsApp", on: false },
    { c: "Phone call - escalation", on: true },
  ]);
  const visibleGroups = useMemo(() => {
    if (filter === "All") return groups;
    return groups.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        filter === "Mentions" ? item.k === "Family" || item.k === "Medical" : item.k !== "Care",
      ),
    }));
  }, [filter]);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Quiet hours respected - emergency overrides on - grouped by intelligence"
        action={<Pill tone="moss">All channels healthy</Pill>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          <div className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Inbox</p>
            <div className="flex gap-2 text-xs">
              {["All", "Unread", "Mentions"].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-3 py-1 ${
                    filter === item
                      ? "bg-olive text-ivory"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {visibleGroups.map((g) => (
            <div key={g.label}>
              <p className="px-6 pt-4 pb-2 text-[10px] uppercase text-muted-foreground">
                {g.label}
              </p>
              <ul>
                {g.items.length === 0 && (
                  <li className="px-6 py-5 text-sm text-muted-foreground">
                    No items in this group.
                  </li>
                )}
                {g.items.map((n, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 px-6 py-3 hover:bg-cream/40 border-b border-border/60 last:border-b-0"
                  >
                    <Avatar name={n.who} tone={n.tone} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{n.who}</span> {n.what}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {n.k} - {n.when}
                      </p>
                    </div>
                    <Pill tone={n.tone as any}>{n.k}</Pill>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="text-xs uppercase text-muted-foreground">Channels</p>
            <ul className="mt-3 space-y-3 text-sm">
              {[...channels].map((c) => (
                <li
                  key={c.c}
                  onClick={() =>
                    setChannels((current) =>
                      current.map((item) => (item.c === c.c ? { ...item, on: !item.on } : item)),
                    )
                  }
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-cream/40 p-3"
                >
                  <span className="text-foreground">{c.c}</span>
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${c.on ? "bg-olive" : "bg-border"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-ivory transition ${c.on ? "translate-x-4" : "translate-x-0.5"}`}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="bg-gradient-olive text-ivory border-none">
            <p className="text-xs uppercase text-ivory/70">Quiet hours</p>
            <p className="mt-2 text-xl font-semibold">22:00 to 07:30</p>
            <p className="mt-1 text-sm text-ivory/85">
              Only Critical and Emergency notifications break through. Family voice messages saved
              until morning.
            </p>
          </Card>

          <Card>
            <p className="text-xs uppercase text-muted-foreground">Smart grouping</p>
            <p className="mt-2 text-sm text-foreground/85">
              14 routine events from Sofia today were grouped into one summary card. Care Kranich
              learns your attention pattern.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
