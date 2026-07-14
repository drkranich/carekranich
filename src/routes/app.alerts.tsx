import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Pill } from "@/components/app/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/app/alerts")({ component: AlertsPage });

type Alert = {
  id: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  resident_id: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

const CATEGORIES = [
  "medication",
  "vitals",
  "mobility",
  "hydration",
  "emotional",
  "inactivity",
  "environmental",
  "smart-home",
  "caregiver",
  "ai-predictive",
];
const SEVERITIES = ["info", "warning", "critical"];

const sevTone = (s: string) => (s === "critical" ? "wine" : s === "warning" ? "gold" : "olive");

function AlertsPage() {
  const { profile, user, hasAnyRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | "resolved">("open");
  const [showForm, setShowForm] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts", statusFilter, profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      let q = supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter === "open") q = q.in("status", ["open", "acknowledged"]);
      if (statusFilter === "resolved") q = q.eq("status", "resolved");
      const { data } = await q;
      return (data ?? []) as Alert[];
    },
  });

  const create = useMutation({
    mutationFn: async (v: {
      title: string;
      description: string;
      category: string;
      severity: string;
    }) => {
      const { error } = await supabase.from("alerts").insert({
        tenant_id: profile!.tenant_id!,
        created_by: user!.id,
        title: v.title,
        description: v.description || null,
        category: v.category,
        severity: v.severity,
      });
      if (error) throw error;
      // Mirror to events stream
      await supabase.from("events").insert({
        tenant_id: profile!.tenant_id!,
        actor_id: user!.id,
        title: `Alert raised: ${v.title}`,
        category: "alert",
        severity: v.severity,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert raised");
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        status: string;
        acknowledged_by?: string;
        acknowledged_at?: string;
        resolved_by?: string;
        resolved_at?: string;
      };
    }) => {
      const { error } = await supabase.from("alerts").update(patch).eq("id", id);
      if (error) throw error;
    },
    // Optimistic update
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["alerts"] });
      const prev = qc.getQueriesData<Alert[]>({ queryKey: ["alerts"] });
      qc.setQueriesData<Alert[]>({ queryKey: ["alerts"] }, (old) =>
        old?.map((a) => (a.id === id ? { ...a, ...(patch as Partial<Alert>) } : a)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      ctx?.prev.forEach(([k, v]) => qc.setQueryData(k, v));
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const acknowledge = (a: Alert) =>
    update.mutate({
      id: a.id,
      patch: {
        status: "acknowledged",
        acknowledged_by: user!.id,
        acknowledged_at: new Date().toISOString(),
      },
    });
  const resolve = (a: Alert) =>
    update.mutate({
      id: a.id,
      patch: { status: "resolved", resolved_by: user!.id, resolved_at: new Date().toISOString() },
    });

  return (
    <>
      <PageHeader
        title="Alert center"
        subtitle="Realtime healthcare alerts - acknowledge - escalate - resolve"
        action={
          canCreate && profile?.tenant_id && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-full bg-wine px-4 py-2 text-xs text-ivory hover:opacity-90"
            >
              {showForm ? "Cancel" : "+ Raise alert"}
            </button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-2">
        {(["open", "resolved", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs capitalize ${
              statusFilter === s
                ? "bg-olive text-ivory"
                : "border border-border bg-ivory hover:bg-cream"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-moss" /> Live
        </span>
      </div>

      {showForm && canCreate && (
        <Card className="mb-6 p-4">
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              create.mutate({
                title: String(f.get("title")),
                description: String(f.get("description") || ""),
                category: String(f.get("category") || "medication"),
                severity: String(f.get("severity") || "warning"),
              });
              (e.target as HTMLFormElement).reset();
            }}
            className="grid grid-cols-1 gap-2 md:grid-cols-4"
          >
            <input
              name="title"
              required
              placeholder="Alert title"
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm md:col-span-2"
            />
            <select
              name="category"
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              name="severity"
              defaultValue="warning"
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm capitalize"
            >
              {SEVERITIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <textarea
              name="description"
              rows={2}
              placeholder="Context / what was observed"
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm md:col-span-3"
            />
            <button
              disabled={create.isPending}
              className="rounded-lg bg-wine py-1.5 text-xs text-ivory hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Raising..." : "Raise alert"}
            </button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-cream/60" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-lg font-semibold text-foreground">All clear.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No {statusFilter !== "all" ? statusFilter : ""} alerts.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const isOpen = a.status === "open";
            const isAck = a.status === "acknowledged";
            return (
              <Card
                key={a.id}
                className={`p-4 ${a.severity === "critical" && isOpen ? "border-wine/40 ring-1 ring-wine/20" : ""}`}
                padded={false}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${
                      a.severity === "critical"
                        ? "bg-wine animate-pulse"
                        : a.severity === "warning"
                          ? "bg-gold"
                          : "bg-olive"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <Pill tone={sevTone(a.severity) as "olive"}>{a.severity}</Pill>
                      <Pill tone="muted">{a.category}</Pill>
                      <Pill tone={a.status === "resolved" ? "moss" : isAck ? "gold" : "wine"}>
                        {a.status}
                      </Pill>
                    </div>
                    {a.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                      {a.acknowledged_at &&
                        ` - Ack ${new Date(a.acknowledged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      {a.resolved_at &&
                        ` - Resolved ${new Date(a.resolved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  {canCreate && (
                    <div className="flex flex-none gap-2">
                      {isOpen && (
                        <button
                          onClick={() => acknowledge(a)}
                          className="rounded-full bg-gold/15 px-3 py-1 text-xs text-gold hover:bg-gold/25"
                        >
                          Acknowledge
                        </button>
                      )}
                      {a.status !== "resolved" && (
                        <button
                          onClick={() => resolve(a)}
                          className="rounded-full bg-moss/15 px-3 py-1 text-xs text-moss hover:bg-moss/25"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
