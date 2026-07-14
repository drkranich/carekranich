import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldCheck, UserCheck } from "lucide-react";
import { Avatar, Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/quality")({ component: Quality });

type StaffScore = {
  id: string;
  name: string;
  role: string;
  accountStatus: string;
  identityStatus: string;
  assigned: number;
  completed: number;
  open: number;
  overdue: number;
  alerts: number;
};

function Quality() {
  const { profile, isSuperAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const quality = useQuery({
    queryKey: ["caregiver-quality-live", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [profiles, roles, tasks, alerts, identities] = await Promise.all([
        db.from("profiles").select("id,tenant_id,full_name,avatar_url,account_status,user_kind,verification_status").order("created_at", { ascending: false }).limit(500),
        db.from("user_roles").select("user_id,role,tenant_id").limit(800),
        db.from("care_tasks").select("id,tenant_id,title,status,priority,due_at,assigned_to,completed_by,completed_at,created_at").order("created_at", { ascending: false }).limit(800),
        db.from("alerts").select("id,tenant_id,title,severity,status,assigned_to,acknowledged_by,resolved_by,created_at").order("created_at", { ascending: false }).limit(400),
        db.from("identity_verifications").select("id,user_id,status,required,reviewed_at,created_at").order("created_at", { ascending: false }).limit(500),
      ]);
      const responses = [profiles, roles, tasks, alerts, identities];
      const errors = responses.map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return {
        profiles: profiles.data ?? [],
        roles: roles.data ?? [],
        tasks: tasks.data ?? [],
        alerts: alerts.data ?? [],
        identities: identities.data ?? [],
      };
    },
  });

  const staffScores = useMemo<StaffScore[]>(() => {
    const data = quality.data;
    if (!data) return [];
    const roleMap = new Map<string, string[]>();
    data.roles.forEach((role: any) => {
      const list = roleMap.get(role.user_id) ?? [];
      list.push(role.role);
      roleMap.set(role.user_id, list);
    });
    const identityMap = new Map<string, string>();
    data.identities.forEach((identity: any) => {
      if (!identityMap.has(identity.user_id)) identityMap.set(identity.user_id, identity.status);
    });
    return data.profiles
      .filter((profileRow: any) => {
        const roles = roleMap.get(profileRow.id) ?? [];
        return roles.some((role) => ["caregiver", "nurse", "doctor", "clinic_admin"].includes(role));
      })
      .map((profileRow: any) => {
        const roles = roleMap.get(profileRow.id) ?? [];
        const assignedTasks = data.tasks.filter((task: any) => task.assigned_to === profileRow.id);
        const completedTasks = data.tasks.filter((task: any) => task.completed_by === profileRow.id);
        const openTasks = assignedTasks.filter((task: any) => !["completed", "cancelled"].includes(task.status));
        const overdueTasks = openTasks.filter((task: any) => task.due_at && new Date(task.due_at).getTime() < Date.now());
        const ownedAlerts = data.alerts.filter((alert: any) =>
          [alert.assigned_to, alert.acknowledged_by, alert.resolved_by].includes(profileRow.id),
        );
        return {
          id: profileRow.id,
          name: profileRow.full_name ?? profileRow.id,
          role: roles.join(", ") || profileRow.user_kind,
          accountStatus: profileRow.account_status,
          identityStatus: identityMap.get(profileRow.id) ?? profileRow.verification_status ?? "not_started",
          assigned: assignedTasks.length,
          completed: completedTasks.length,
          open: openTasks.length,
          overdue: overdueTasks.length,
          alerts: ownedAlerts.length,
        };
      });
  }, [quality.data]);

  const selected = staffScores.find((staff) => staff.id === selectedId) ?? staffScores[0] ?? null;
  const totalAssigned = staffScores.reduce((sum, staff) => sum + staff.assigned, 0);
  const totalCompleted = staffScores.reduce((sum, staff) => sum + staff.completed, 0);
  const totalOpen = staffScores.reduce((sum, staff) => sum + staff.open, 0);
  const totalOverdue = staffScores.reduce((sum, staff) => sum + staff.overdue, 0);
  const verifiedStaff = staffScores.filter((staff) => staff.identityStatus === "verified").length;
  const completionRate = totalAssigned + totalCompleted === 0 ? 0 : Math.round((totalCompleted / (totalAssigned + totalCompleted)) * 100);

  return (
    <>
      <PageHeader
        title="Caregiver quality"
        subtitle="Operational quality from task, alert, role and identity-verification records."
        action={<Pill tone={quality.isError ? "wine" : "moss"}>{quality.isError ? "Read error" : "Live data"}</Pill>}
      />

      {quality.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading quality records...</p>
      ) : quality.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load quality records.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(quality.error as Error).message}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Staff profiles" value={staffScores.length} sub="Care roles only" tone="olive" />
            <Stat label="Completion rate" value={`${completionRate}%`} sub={`${totalCompleted} completed records`} tone="moss" />
            <Stat label="Open tasks" value={totalOpen} sub={`${totalOverdue} overdue`} tone="gold" />
            <Stat label="Verified identity" value={`${verifiedStaff}/${staffScores.length}`} sub="From identity checks" tone="wine" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.8fr]">
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                  <UserCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Care staff scorecards</h2>
                  <p className="text-xs text-muted-foreground">Rows are built from Supabase roles, profiles and tasks.</p>
                </div>
              </div>

              {staffScores.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="No care staff records yet" hint="Approve caregivers, nurses or doctors and assign tasks to populate this page." />
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto app-scrollbar">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="py-2 text-left">Staff</th>
                        <th className="py-2 text-left">Role</th>
                        <th className="py-2 text-left">Assigned</th>
                        <th className="py-2 text-left">Completed</th>
                        <th className="py-2 text-left">Open</th>
                        <th className="py-2 text-left">Overdue</th>
                        <th className="py-2 text-left">Identity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffScores.map((staff) => (
                        <tr
                          key={staff.id}
                          onClick={() => setSelectedId(staff.id)}
                          className={`cursor-pointer border-b border-border/35 last:border-0 ${
                            selected?.id === staff.id ? "bg-olive/10" : "hover:bg-white/45"
                          }`}
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={staff.name} />
                              <div>
                                <p className="font-medium text-foreground">{staff.name}</p>
                                <p className="text-xs text-muted-foreground">{staff.accountStatus}</p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-[180px] truncate py-3 pr-4">{staff.role}</td>
                          <td className="py-3 pr-4">{staff.assigned}</td>
                          <td className="py-3 pr-4">{staff.completed}</td>
                          <td className="py-3 pr-4">{staff.open}</td>
                          <td className="py-3 pr-4">{staff.overdue}</td>
                          <td className="py-3 pr-4">
                            <Pill tone={statusTone(staff.identityStatus)}>{staff.identityStatus}</Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moss/10 text-moss">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Selected staff</h2>
                    <p className="text-xs text-muted-foreground">Real operational footprint.</p>
                  </div>
                </div>
                {selected ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-2xl font-semibold text-foreground">{selected.name}</p>
                    <Pill tone={statusTone(selected.identityStatus)}>{selected.identityStatus}</Pill>
                    <Metric label="Assigned tasks" value={selected.assigned} />
                    <Metric label="Completed tasks" value={selected.completed} />
                    <Metric label="Open tasks" value={selected.open} />
                    <Metric label="Overdue tasks" value={selected.overdue} />
                    <Metric label="Linked alerts" value={selected.alerts} />
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-muted-foreground">No staff selected.</p>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                    <BadgeCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Quality rules</h2>
                    <p className="text-xs text-muted-foreground">Only measurable signals appear.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <p className="rounded-2xl border border-border/60 bg-cream/40 p-3">
                    Family satisfaction activates when review records are connected.
                  </p>
                  <p className="rounded-2xl border border-border/60 bg-cream/40 p-3">
                    Wellbeing scoring activates when a consented staff data source is connected.
                  </p>
                  <p className="rounded-2xl border border-border/60 bg-cream/40 p-3">
                    Certifications should be backed by uploaded documents and identity verification.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-cream/40 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}

function statusTone(status: string | null | undefined): "moss" | "wine" | "gold" | "olive" | "muted" {
  const value = String(status ?? "").toLowerCase();
  if (["active", "verified", "approved"].includes(value)) return "moss";
  if (["pending", "not_started"].includes(value)) return "gold";
  if (["rejected", "suspended", "revoked"].includes(value)) return "wine";
  return "muted";
}
