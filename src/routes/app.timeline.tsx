import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { toast } from "sonner";

export const Route = createFileRoute("/app/timeline")({ component: TimelinePage });

type EventRow = {
  id: string;
  tenant_id: string;
  resident_id: string | null;
  actor_id: string | null;
  category: string;
  severity: string;
  title: string;
  description: string | null;
  occurred_at: string;
};

const CATEGORIES = [
  { value: "all", label: "Todos" },
  { value: "general", label: "Em geral" },
  { value: "medication", label: "Medicamento" },
  { value: "vitals", label: "Sinais vitais" },
  { value: "nutrition", label: "Nutricao" },
  { value: "hydration", label: "Hidratacao" },
  { value: "mobility", label: "Mobilidade" },
  { value: "mood", label: "Humor" },
  { value: "incident", label: "Incidente" },
  { value: "memory", label: "Memoria" },
  { value: "alert", label: "Alerta" },
];
const SEVERITIES = [
  { value: "all", label: "Todos" },
  { value: "info", label: "Informacoes" },
  { value: "success", label: "Sucesso" },
  { value: "warning", label: "Aviso" },
  { value: "critical", label: "Critico" },
];

const sevTone = (s: string) =>
  s === "critical" ? "wine" : s === "warning" ? "gold" : s === "success" ? "moss" : "olive";

function toDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function dayLabel(key: string) {
  const today = toDayKey(new Date());
  const yest = toDayKey(new Date(Date.now() - 86400000));
  if (key === today) return "Today";
  if (key === yest) return "Yesterday";
  return new Date(key).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function TimelinePage() {
  const { profile, user, hasAnyRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canLog = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);

  const [date, setDate] = useState(() => toDayKey(new Date()));
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [formCategory, setFormCategory] = useState("general");
  const [formSeverity, setFormSeverity] = useState("info");
  const [showForm, setShowForm] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", { date, category, severity, tenantId: profile?.tenant_id, isSuperAdmin }],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const start = new Date(date + "T00:00:00").toISOString();
      const end = new Date(date + "T23:59:59.999").toISOString();
      let q = supabase
        .from("events")
        .select("*")
        .gte("occurred_at", start)
        .lte("occurred_at", end)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (category !== "all") q = q.eq("category", category);
      if (severity !== "all") q = q.eq("severity", severity);
      const { data } = await q;
      return (data ?? []) as EventRow[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (vars: {
      title: string;
      category: string;
      severity: string;
      description: string;
    }) => {
      const { error } = await supabase.from("events").insert({
        tenant_id: profile!.tenant_id!,
        actor_id: user!.id,
        title: vars.title,
        category: vars.category,
        severity: vars.severity,
        description: vars.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event logged");
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const e of events) {
      const k = toDayKey(new Date(e.occurred_at));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries());
  }, [events]);

  const shiftDay = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toDayKey(d));
  };

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle="A unified, realtime stream of every meaningful care moment."
        action={
          canLog && profile?.tenant_id && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-full bg-olive px-4 py-2 text-xs text-ivory hover:opacity-90"
            >
              {showForm ? "Cancel" : "+ Log event"}
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => shiftDay(-1)}
          className="rounded-full border border-border bg-ivory px-3 py-1.5 text-xs hover:bg-cream"
        >
          Yesterday
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-full border border-border bg-ivory px-3 py-1.5 text-xs"
        />
        <button
          onClick={() => shiftDay(1)}
          className="rounded-full border border-border bg-ivory px-3 py-1.5 text-xs hover:bg-cream"
        >
          Tomorrow
        </button>
        <button
          onClick={() => setDate(toDayKey(new Date()))}
          className="rounded-full border border-border bg-ivory px-3 py-1.5 text-xs hover:bg-cream"
        >
          Today
        </button>

        <span className="mx-2 h-4 w-px bg-border" />

        <GlassSelect
          value={category}
          onChange={setCategory}
          options={CATEGORIES}
          className="w-36"
        />
        <GlassSelect
          value={severity}
          onChange={setSeverity}
          options={SEVERITIES}
          className="w-36"
        />

        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-moss" /> Live
        </span>
      </div>

      {showForm && canLog && (
        <Card className="mb-6 p-4">
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              createEvent.mutate({
                title: String(f.get("title")),
                category: String(f.get("category") || "general"),
                severity: String(f.get("severity") || "info"),
                description: String(f.get("description") || ""),
              });
              (e.target as HTMLFormElement).reset();
              setFormCategory("general");
              setFormSeverity("info");
            }}
            className="grid grid-cols-1 gap-2 md:grid-cols-4"
          >
            <input
              name="title"
              required
              placeholder="What happened?"
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm md:col-span-2"
            />
            <GlassSelect
              name="category"
              value={formCategory}
              onChange={setFormCategory}
              options={CATEGORIES.filter((item) => item.value !== "all")}
            />
            <GlassSelect
              name="severity"
              value={formSeverity}
              onChange={setFormSeverity}
              options={SEVERITIES.filter((item) => item.value !== "all")}
            />
            <textarea
              name="description"
              placeholder="Notes (optional)"
              rows={2}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm md:col-span-3"
            />
            <button
              disabled={createEvent.isPending}
              className="rounded-lg bg-olive py-1.5 text-xs text-ivory hover:opacity-90 disabled:opacity-50"
            >
              {createEvent.isPending ? "Logging..." : "Log event"}
            </button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-cream/60" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-lg font-semibold text-foreground">A quiet day.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No events recorded for {dayLabel(date)}.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {dayLabel(day)}
              </p>
              <div className="space-y-1.5">
                {items.map((e) => (
                  <Card key={e.id} className="flex items-start gap-3 p-3" padded={false}>
                    <Avatar name={e.category} tone={sevTone(e.severity) as "olive"} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                        <Pill tone={sevTone(e.severity) as "olive"}>{e.severity}</Pill>
                        <Pill tone="muted">{e.category}</Pill>
                      </div>
                      {e.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{e.description}</p>
                      )}
                    </div>
                    <span className="flex-none text-xs text-muted-foreground">
                      {new Date(e.occurred_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
