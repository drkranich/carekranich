import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CheckCircle2, Clock, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/command")({ component: Command });

type CommandData = {
  tenants: any[];
  residents: any[];
  alerts: any[];
  tasks: any[];
  threads: any[];
  profiles: any[];
};

function Command() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const command = useQuery({
    queryKey: ["operations-command", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [tenants, residents, alerts, tasks, threads, profiles] = await Promise.all([
        db.from("tenants").select("id,name,status,billing_status").order("created_at", { ascending: false }).limit(200),
        db.from("residents").select("id,tenant_id,full_name,created_at").order("created_at", { ascending: false }).limit(500),
        db.from("alerts").select("id,tenant_id,resident_id,title,description,severity,status,category,created_at,updated_at,acknowledged_at,resolved_at").order("created_at", { ascending: false }).limit(300),
        db.from("care_tasks").select("id,tenant_id,resident_id,title,status,priority,due_at,assigned_to,completed_at,created_at").order("created_at", { ascending: false }).limit(500),
        db.from("inbox_threads").select("id,tenant_id,subject,status,priority,last_message_at").order("last_message_at", { ascending: false }).limit(100),
        db.from("profiles").select("id,tenant_id,full_name,account_status,user_kind,verification_status").order("created_at", { ascending: false }).limit(300),
      ]);
      const responses = [tenants, residents, alerts, tasks, threads, profiles];
      const errors = responses.map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return {
        tenants: tenants.data ?? [],
        residents: residents.data ?? [],
        alerts: alerts.data ?? [],
        tasks: tasks.data ?? [],
        threads: threads.data ?? [],
        profiles: profiles.data ?? [],
      } as CommandData;
    },
  });

  const data = command.data;
  const openAlerts = (data?.alerts ?? []).filter((alert) => !["resolved", "closed"].includes(alert.status));
  const criticalAlerts = openAlerts.filter((alert) => ["critical", "high"].includes(alert.severity));
  const openTasks = (data?.tasks ?? []).filter((task) => !["completed", "cancelled"].includes(task.status));
  const overdueTasks = openTasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < Date.now());
  const openThreads = (data?.threads ?? []).filter((thread) => thread.status !== "closed");
  const activeStaff = (data?.profiles ?? []).filter((item) =>
    ["staff", "clinic", "service_provider"].includes(item.user_kind) && item.account_status === "active",
  );
  const selectedAlert = openAlerts.find((alert) => alert.id === selectedAlertId) ?? openAlerts[0] ?? null;

  const residentName = useMemo(() => {
    const map = new Map<string, string>();
    (data?.residents ?? []).forEach((resident) => map.set(resident.id, resident.full_name));
    return map;
  }, [data?.residents]);

  const tenantName = useMemo(() => {
    const map = new Map<string, string>();
    (data?.tenants ?? []).forEach((tenant) => map.set(tenant.id, tenant.name));
    return map;
  }, [data?.tenants]);

  const coverage = useMemo(() => {
    const tenantIds = new Set<string>();
    [...(data?.tenants ?? []), ...(data?.residents ?? []), ...(data?.alerts ?? []), ...(data?.tasks ?? [])].forEach(
      (item) => item.tenant_id && tenantIds.add(item.tenant_id),
    );
    return Array.from(tenantIds).map((tenantId) => ({
      id: tenantId,
      name: tenantName.get(tenantId) ?? tenantId,
      residents: (data?.residents ?? []).filter((item) => item.tenant_id === tenantId).length,
      openAlerts: openAlerts.filter((item) => item.tenant_id === tenantId).length,
      openTasks: openTasks.filter((item) => item.tenant_id === tenantId).length,
      inbox: openThreads.filter((item) => item.tenant_id === tenantId).length,
    }));
  }, [data, openAlerts, openTasks, openThreads, tenantName]);

  const loadCells = useMemo(() => {
    const cells = Array.from({ length: 24 }, (_, hour) => ({ hour, tasks: 0, alerts: 0 }));
    openTasks.forEach((task) => {
      if (!task.due_at) return;
      const hour = new Date(task.due_at).getHours();
      cells[hour].tasks += 1;
    });
    openAlerts.forEach((alert) => {
      const hour = new Date(alert.created_at).getHours();
      cells[hour].alerts += 1;
    });
    return cells;
  }, [openAlerts, openTasks]);

  const updateAlert = async (id: string, status: "acknowledged" | "resolved") => {
    const patch =
      status === "resolved"
        ? { status, resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null }
        : { status, acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id ?? null };
    const { error } = await (supabase as any).from("alerts").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "resolved" ? "Alert resolved" : "Alert acknowledged");
    qc.invalidateQueries({ queryKey: ["operations-command"] });
  };

  return (
    <>
      <PageHeader
        title="Operations command center"
        subtitle="Live operational view from Supabase records across tenants, residents, alerts and care work."
        action={<Pill tone={command.isError ? "wine" : "moss"}>{command.isError ? "Read error" : "Live data"}</Pill>}
      />

      {command.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading operations...</p>
      ) : command.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load command data.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(command.error as Error).message}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Residents" value={data?.residents.length ?? 0} sub="From residents table" tone="olive" />
            <Stat label="Open alerts" value={openAlerts.length} sub={`${criticalAlerts.length} critical/high`} tone="wine" />
            <Stat label="Open tasks" value={openTasks.length} sub={`${overdueTasks.length} overdue`} tone="gold" />
            <Stat label="Open inbox" value={openThreads.length} sub="Conversations not closed" tone="moss" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.9fr]">
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Coverage by organization</h2>
                  <p className="text-xs text-muted-foreground">Grouped from tenants, residents, alerts, tasks and inbox.</p>
                </div>
              </div>
              {coverage.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="No operational records yet" hint="Create residents, tasks or alerts to populate command center." />
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto app-scrollbar">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="py-2 text-left">Organization</th>
                        <th className="py-2 text-left">Residents</th>
                        <th className="py-2 text-left">Open alerts</th>
                        <th className="py-2 text-left">Open tasks</th>
                        <th className="py-2 text-left">Inbox</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverage.map((row) => (
                        <tr key={row.id} className="border-b border-border/35 last:border-0">
                          <td className="py-3 pr-4 font-medium text-foreground">{row.name}</td>
                          <td className="py-3 pr-4">{row.residents}</td>
                          <td className="py-3 pr-4">{row.openAlerts}</td>
                          <td className="py-3 pr-4">{row.openTasks}</td>
                          <td className="py-3 pr-4">{row.inbox}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-wine/10 text-wine">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Active alerts</h2>
                  <p className="text-xs text-muted-foreground">Action buttons update Supabase.</p>
                </div>
              </div>
              {openAlerts.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-border/60 bg-cream/40 p-4 text-sm text-muted-foreground">
                  No open alerts.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {openAlerts.slice(0, 8).map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => setSelectedAlertId(alert.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        selectedAlert?.id === alert.id ? "border-wine/40 bg-wine/5" : "border-border bg-white/45 hover:bg-white/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-foreground">{alert.title}</p>
                        <Pill tone={severityTone(alert.severity)}>{alert.severity}</Pill>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {alert.resident_id ? residentName.get(alert.resident_id) ?? alert.resident_id : "No resident"} · {alert.status}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {selectedAlert && (
                <div className="mt-4 rounded-2xl border border-border/60 bg-cream/45 p-4">
                  <p className="text-sm font-medium text-foreground">{selectedAlert.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedAlert.description ?? "No description."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => updateAlert(selectedAlert.id, "acknowledged")} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">
                      Acknowledge
                    </button>
                    <button onClick={() => updateAlert(selectedAlert.id, "resolved")} className="rounded-full border border-border px-3 py-1.5 text-xs">
                      Resolve
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Load by hour</h2>
                  <p className="text-xs text-muted-foreground">Derived from open task due times and alert creation times.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-12 gap-1">
                {loadCells.map((cell) => {
                  const load = cell.tasks + cell.alerts;
                  return (
                    <div
                      key={cell.hour}
                      title={`${cell.hour}:00 · ${cell.tasks} tasks · ${cell.alerts} alerts`}
                      className="aspect-square rounded-md border border-white/40"
                      style={{
                        background: load === 0 ? "rgba(255,255,255,.42)" : cell.alerts > 0 ? "var(--wine)" : "var(--olive)",
                        opacity: load === 0 ? 1 : Math.min(0.25 + load * 0.14, 0.9),
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between text-[10px] uppercase text-muted-foreground">
                <span>00h</span>
                <span>12h</span>
                <span>23h</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moss/10 text-moss">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Staff snapshot</h2>
                  <p className="text-xs text-muted-foreground">Staffing metrics activate when shifts are recorded.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <Metric label="Active staff profiles" value={activeStaff.length} />
                <Metric label="Assigned open tasks" value={openTasks.filter((task) => task.assigned_to).length} />
                <Metric label="Unassigned open tasks" value={openTasks.filter((task) => !task.assigned_to).length} />
                <Metric label="Unread/open conversations" value={openThreads.length} icon={<Inbox className="h-4 w-4" />} />
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-cream/40 px-4 py-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}

function severityTone(severity: string | null | undefined): "moss" | "wine" | "gold" | "terracotta" | "muted" {
  const value = String(severity ?? "").toLowerCase();
  if (["critical", "high"].includes(value)) return "wine";
  if (["medium", "med"].includes(value)) return "gold";
  if (["low", "info"].includes(value)) return "moss";
  return "muted";
}
