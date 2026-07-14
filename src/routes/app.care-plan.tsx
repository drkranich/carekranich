import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, PageHeader, Pill } from "@/components/app/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/app/care-plan")({ component: CarePlanPage });

type Resident = { id: string; full_name: string; preferred_name: string | null };
type Plan = {
  id: string;
  resident_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
};
type Task = {
  id: string;
  resident_id: string;
  care_plan_id: string | null;
  title: string;
  notes: string | null;
  category: string;
  status: string;
  priority: string;
  due_at: string | null;
  completed_at: string | null;
};

const CATEGORIES = [
  "general",
  "medication",
  "vitals",
  "nutrition",
  "hydration",
  "mobility",
  "cognition",
  "emotional",
];
const PRIORITIES = ["low", "normal", "high", "critical"];

function CarePlanPage() {
  const { user, profile, hasAnyRole } = useAuth();
  const qc = useQueryClient();
  const canEditPlans = hasAnyRole(["nurse", "doctor", "clinic_admin", "super_admin"]);
  const canEditTasks = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);

  const [residentId, setResidentId] = useState<string>("");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const { data: residents = [], isLoading: residentsLoading } = useQuery({
    queryKey: ["residents-list"],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("residents")
        .select("id,full_name,preferred_name")
        .order("full_name");
      const r = (data ?? []) as Resident[];
      if (r[0] && !residentId) setResidentId(r[0].id);
      return r;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["care-plans", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("care_plans")
        .select("*")
        .eq("resident_id", residentId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Plan[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["care-tasks", residentId],
    enabled: !!residentId,
    queryFn: async () => {
      const { data } = await supabase
        .from("care_tasks")
        .select("*")
        .eq("resident_id", residentId)
        .order("due_at", { ascending: true, nullsFirst: false });
      return (data ?? []) as Task[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (v: {
      title: string;
      description: string | null;
      priority: string;
      start_date: string | null;
      end_date: string | null;
    }) => {
      const { error } = await supabase.from("care_plans").insert({
        tenant_id: profile!.tenant_id!,
        resident_id: residentId,
        created_by: user!.id,
        title: v.title,
        description: v.description,
        priority: v.priority,
        start_date: v.start_date,
        end_date: v.end_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-plans", residentId] });
      toast.success("Plan created");
      setShowPlanForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTask = useMutation({
    mutationFn: async (v: {
      title: string;
      notes: string | null;
      category: string;
      priority: string;
      due_at: string | null;
      care_plan_id: string | null;
    }) => {
      const { error } = await supabase.from("care_tasks").insert({
        tenant_id: profile!.tenant_id!,
        resident_id: residentId,
        created_by: user!.id,
        title: v.title,
        notes: v.notes,
        category: v.category,
        priority: v.priority,
        due_at: v.due_at,
        care_plan_id: v.care_plan_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-tasks", residentId] });
      toast.success("Task added");
      setShowTaskForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async (t: Task) => {
      const done = t.status === "completed";
      const patch = {
        status: done ? "pending" : "completed",
        completed_at: done ? null : new Date().toISOString(),
        completed_by: done ? null : user!.id,
      };
      const { error } = await supabase.from("care_tasks").update(patch).eq("id", t.id);
      if (error) throw error;
      // Emit event on completion (best-effort)
      if (!done) {
        await supabase.from("events").insert({
          tenant_id: profile!.tenant_id!,
          actor_id: user!.id,
          resident_id: t.resident_id,
          title: `Task completed: ${t.title}`,
          category: t.category,
          severity: "success",
        });
      }
    },
    onMutate: async (t) => {
      await qc.cancelQueries({ queryKey: ["care-tasks", residentId] });
      const prev = qc.getQueryData<Task[]>(["care-tasks", residentId]);
      const done = t.status === "completed";
      qc.setQueryData<Task[]>(["care-tasks", residentId], (old) =>
        old?.map((x) =>
          x.id === t.id
            ? {
                ...x,
                status: done ? "pending" : "completed",
                completed_at: done ? null : new Date().toISOString(),
              }
            : x,
        ),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      qc.setQueryData(["care-tasks", residentId], ctx?.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["care-tasks", residentId] }),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("care_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["care-plans", residentId] }),
  });
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("care_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["care-tasks", residentId] }),
  });

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.due_at && new Date(t.due_at) < new Date(),
    ).length;
    return { total, done, overdue, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  if (residentsLoading)
    return <p className="text-sm text-muted-foreground">Loading care plan...</p>;

  return (
    <>
      <PageHeader
        title="Care plan"
        subtitle="Individualized plans and daily tasks - synced live across the care team"
      />

      {residents.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Add a resident first to start building care plans.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase text-muted-foreground">Resident</label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
            >
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.preferred_name ?? r.full_name}
                </option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-2">
              <Pill>
                {stats.done}/{stats.total} done
              </Pill>
              {stats.overdue > 0 && <Pill tone="wine">{stats.overdue} overdue</Pill>}
              <Pill tone="moss">{stats.pct}%</Pill>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-moss" /> Live
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Plans */}
            <Card className="p-6 lg:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Plans</h3>
                {canEditPlans && (
                  <button
                    onClick={() => setShowPlanForm((v) => !v)}
                    className="rounded-full bg-olive px-3 py-1 text-xs text-ivory hover:opacity-90"
                  >
                    {showPlanForm ? "Cancel" : "+ New"}
                  </button>
                )}
              </div>
              {showPlanForm && canEditPlans && (
                <form
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    createPlan.mutate({
                      title: String(f.get("title")),
                      description: String(f.get("description") || "") || null,
                      priority: String(f.get("priority") || "normal"),
                      start_date: (f.get("start_date") as string) || null,
                      end_date: (f.get("end_date") as string) || null,
                    });
                    (e.target as HTMLFormElement).reset();
                  }}
                  className="mb-4 space-y-2 rounded-2xl border border-border bg-ivory p-3"
                >
                  <input
                    name="title"
                    required
                    placeholder="Plan title"
                    className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                  />
                  <textarea
                    name="description"
                    placeholder="Description / goals"
                    className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <select
                      name="priority"
                      className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      name="start_date"
                      className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                    />
                    <input
                      type="date"
                      name="end_date"
                      className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    disabled={createPlan.isPending}
                    className="w-full rounded-lg bg-olive py-1.5 text-xs text-ivory hover:opacity-90 disabled:opacity-50"
                  >
                    {createPlan.isPending ? "Creating..." : "Create plan"}
                  </button>
                </form>
              )}
              <div className="space-y-2">
                {plans.length === 0 && (
                  <p className="text-xs text-muted-foreground">No plans yet.</p>
                )}
                {plans.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-ivory/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <Pill
                        tone={p.priority === "critical" || p.priority === "high" ? "wine" : "moss"}
                      >
                        {p.priority}
                      </Pill>
                    </div>
                    {p.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {p.start_date ?? "-"} to {p.end_date ?? "ongoing"}
                      </span>
                      {hasAnyRole(["clinic_admin", "super_admin"]) && (
                        <button
                          onClick={() => {
                            if (confirm("Delete this care plan?")) deletePlan.mutate(p.id);
                          }}
                          className="text-wine hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tasks */}
            <Card className="p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Daily tasks</h3>
                {canEditTasks && (
                  <button
                    onClick={() => setShowTaskForm((v) => !v)}
                    className="rounded-full bg-olive px-3 py-1 text-xs text-ivory hover:opacity-90"
                  >
                    {showTaskForm ? "Cancel" : "+ New task"}
                  </button>
                )}
              </div>
              {showTaskForm && canEditTasks && (
                <form
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const due = f.get("due_at") as string;
                    createTask.mutate({
                      care_plan_id: (f.get("care_plan_id") as string) || null,
                      title: String(f.get("title")),
                      notes: String(f.get("notes") || "") || null,
                      category: String(f.get("category") || "general"),
                      priority: String(f.get("priority") || "normal"),
                      due_at: due ? new Date(due).toISOString() : null,
                    });
                    (e.target as HTMLFormElement).reset();
                  }}
                  className="mb-4 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-ivory p-3 md:grid-cols-2"
                >
                  <input
                    name="title"
                    required
                    placeholder="Task title"
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm md:col-span-2"
                  />
                  <select
                    name="category"
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    name="priority"
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    name="due_at"
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                  />
                  <select
                    name="care_plan_id"
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                  >
                    <option value="">No plan</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <textarea
                    name="notes"
                    placeholder="Notes"
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm md:col-span-2"
                    rows={2}
                  />
                  <button
                    disabled={createTask.isPending}
                    className="rounded-lg bg-olive py-1.5 text-xs text-ivory hover:opacity-90 disabled:opacity-50 md:col-span-2"
                  >
                    {createTask.isPending ? "Adding..." : "Create task"}
                  </button>
                </form>
              )}
              <div className="space-y-1.5">
                {tasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tasks yet.</p>
                )}
                {tasks.map((t) => {
                  const done = t.status === "completed";
                  const overdue = !done && t.due_at && new Date(t.due_at) < new Date();
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                        done
                          ? "border-border bg-cream/40"
                          : overdue
                            ? "border-wine/30 bg-wine/5"
                            : "border-border bg-ivory"
                      }`}
                    >
                      <button
                        disabled={!canEditTasks || toggleTask.isPending}
                        onClick={() => toggleTask.mutate(t)}
                        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition-all ${
                          done ? "border-moss bg-moss text-ivory" : "border-border bg-card"
                        } ${canEditTasks ? "hover:border-olive" : "cursor-not-allowed"}`}
                      >
                        {done && (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}
                        >
                          {t.title}
                        </p>
                        {t.notes && (
                          <p className="truncate text-xs text-muted-foreground">{t.notes}</p>
                        )}
                      </div>
                      <Pill>{t.category}</Pill>
                      {t.due_at && (
                        <span
                          className={`text-xs ${overdue ? "text-wine" : "text-muted-foreground"}`}
                        >
                          {new Date(t.due_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {t.priority !== "normal" && (
                        <Pill
                          tone={
                            t.priority === "critical" || t.priority === "high" ? "wine" : "moss"
                          }
                        >
                          {t.priority}
                        </Pill>
                      )}
                      {hasAnyRole(["clinic_admin", "super_admin"]) && (
                        <button
                          onClick={() => deleteTask.mutate(t.id)}
                          className="text-xs text-muted-foreground hover:text-wine"
                        >
                          x
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
