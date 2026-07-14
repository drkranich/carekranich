import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, MapPin, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/caregiver")({
  component: CaregiverApp,
});

function CaregiverApp() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();

  const workspace = useQuery({
    queryKey: ["caregiver-workspace", profile?.tenant_id, user?.id, isSuperAdmin],
    enabled: (!!profile?.tenant_id || isSuperAdmin) && !!user,
    queryFn: async () => {
      const db = supabase as any;
      const [tasks, residents, alerts, locations] = await Promise.all([
        db.from("care_tasks").select("id,resident_id,title,status,priority,due_at,notes,assigned_to,created_at").order("due_at", { ascending: true, nullsFirst: false }).limit(200),
        db.from("residents").select("id,full_name,preferred_name,photo_url").order("full_name", { ascending: true }).limit(200),
        db.from("alerts").select("id,resident_id,title,severity,status,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("address_locations").select("id,entity_type,entity_id,label,address,city,state,country,latitude,longitude").eq("entity_type", "resident").limit(200),
      ]);
      const errors = [tasks, residents, alerts, locations].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return {
        tasks: tasks.data ?? [],
        residents: residents.data ?? [],
        alerts: alerts.data ?? [],
        locations: locations.data ?? [],
      };
    },
  });

  const residentMap = useMemo(() => {
    const map = new Map<string, any>();
    (workspace.data?.residents ?? []).forEach((resident: any) => map.set(resident.id, resident));
    return map;
  }, [workspace.data?.residents]);

  const openTasks = (workspace.data?.tasks ?? []).filter((task: any) => !["completed", "cancelled"].includes(task.status));
  const myTasks = openTasks.filter((task: any) => !task.assigned_to || task.assigned_to === user?.id);
  const completedToday = (workspace.data?.tasks ?? []).filter((task: any) => task.status === "completed").length;
  const openAlerts = (workspace.data?.alerts ?? []).filter((alert: any) => !["resolved", "closed"].includes(alert.status));

  const completeTask = async (task: any) => {
    const { error } = await (supabase as any)
      .from("care_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString(), completed_by: user?.id ?? null })
      .eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success("Task completed");
    qc.invalidateQueries({ queryKey: ["caregiver-workspace"] });
  };

  return (
    <>
      <PageHeader
        title="Caregiver app"
        subtitle="Field workspace backed by real care tasks, residents, alerts and geocoded addresses."
        action={<Pill tone={workspace.isError ? "wine" : "olive"}>{workspace.isError ? "Read error" : "Live care queue"}</Pill>}
      />

      {workspace.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading caregiver workspace...</p>
      ) : workspace.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load caregiver data.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(workspace.error as Error).message}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Open tasks" value={myTasks.length} sub="Assigned to you or unassigned" tone="olive" />
            <Stat label="Completed" value={completedToday} sub="Completed records visible" tone="moss" />
            <Stat label="Open alerts" value={openAlerts.length} sub="Resident-linked alerts" tone="wine" />
            <Stat label="Residents" value={workspace.data?.residents.length ?? 0} sub="Tenant scope" tone="gold" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Task queue</h2>
                  <p className="text-xs text-muted-foreground">Completing a task updates Supabase.</p>
                </div>
              </div>
              {myTasks.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="No open tasks" hint="Create care tasks in Care plan to populate the caregiver app." />
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {myTasks.map((task: any) => {
                    const resident = task.resident_id ? residentMap.get(task.resident_id) : null;
                    return (
                      <div key={task.id} className="rounded-2xl border border-border/60 bg-white/50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={resident?.preferred_name || resident?.full_name || "Resident"} src={resident?.photo_url} />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {resident?.preferred_name || resident?.full_name || "No resident"} · {task.due_at ? new Date(task.due_at).toLocaleString() : "No due time"}
                              </p>
                            </div>
                          </div>
                          <Pill tone={priorityTone(task.priority)}>{task.priority}</Pill>
                        </div>
                        {task.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{task.notes}</p>}
                        <button onClick={() => completeTask(task)} className="mt-3 rounded-full bg-olive px-4 py-2 text-xs text-ivory">
                          Mark completed
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-olive" />
                  <h2 className="text-xl font-semibold text-foreground">Open alerts</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {openAlerts.slice(0, 6).map((alert: any) => (
                    <div key={alert.id} className="rounded-2xl border border-border/60 bg-cream/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{alert.title}</p>
                        <Pill tone={priorityTone(alert.severity)}>{alert.severity}</Pill>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {alert.resident_id ? residentMap.get(alert.resident_id)?.full_name ?? alert.resident_id : "No resident"}
                      </p>
                    </div>
                  ))}
                  {openAlerts.length === 0 && <p className="text-sm text-muted-foreground">No open alerts.</p>}
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-olive" />
                  <h2 className="text-xl font-semibold text-foreground">Known addresses</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {(workspace.data?.locations ?? []).slice(0, 6).map((location: any) => (
                    <div key={location.id} className="rounded-2xl border border-border/60 bg-cream/40 p-3">
                      <p className="text-sm text-foreground">{location.address}</p>
                      <p className="text-xs text-muted-foreground">{[location.city, location.state, location.country].filter(Boolean).join(", ")}</p>
                    </div>
                  ))}
                  {(workspace.data?.locations ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No resident addresses saved yet.</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-olive" />
                  <p className="text-sm text-muted-foreground">Offline mode, voice capture and mobile push require native/mobile infrastructure; this page only shows persisted web records.</p>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function priorityTone(value: string | null | undefined): "moss" | "wine" | "gold" | "muted" {
  const priority = String(value ?? "").toLowerCase();
  if (["critical", "high"].includes(priority)) return "wine";
  if (["warning", "medium", "normal"].includes(priority)) return "gold";
  if (["low", "info"].includes(priority)) return "moss";
  return "muted";
}
