import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader, Pill, Stat, EmptyState } from "@/components/app/primitives";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { useGreeting } from "@/hooks/use-greeting";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/")({ component: Overview });

function Overview() {
  const { profile, displayName, primaryRole, isStaff, isSuperAdmin, isAdmin } = useAuth();
  const { greeting } = useGreeting(displayName);
  const tenantId = profile?.tenant_id ?? null;

  const stats = useQuery({
    queryKey: ["overview-stats", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [residents, openAlerts, tasksToday, tasksDone] = await Promise.all([
        supabase.from("residents").select("id", { count: "exact", head: true }),
        supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("care_tasks")
          .select("id", { count: "exact", head: true })
          .gte("due_at", today.toISOString()),
        supabase
          .from("care_tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("completed_at", today.toISOString()),
      ]);
      return {
        residents: residents.count ?? 0,
        openAlerts: openAlerts.count ?? 0,
        tasksToday: tasksToday.count ?? 0,
        tasksDone: tasksDone.count ?? 0,
      };
    },
  });

  const recent = useQuery({
    queryKey: ["overview-recent", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,severity,occurred_at,category")
        .order("occurred_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const s = stats.data;
  const summary = stats.isLoading
    ? "Loading live platform records..."
    : !s
      ? isSuperAdmin
        ? "No platform activity has been recorded yet."
        : "Join an approved organization to start receiving live care records."
    : s.openAlerts > 0
      ? `${s.openAlerts} ${s.openAlerts === 1 ? "alert needs" : "alerts need"} attention.`
      : s.tasksToday > 0
        ? `${s.tasksDone} of ${s.tasksToday} care tasks completed today.`
        : "Everything is calm. No active alerts.";

  return (
    <>
      <PageHeader
        title={greeting || "Welcome"}
        subtitle={summary}
        action={
          <div className="flex items-center gap-2">
            <Pill tone={s && s.openAlerts > 0 ? "wine" : "moss"}>
              <span
                className={`h-1.5 w-1.5 animate-pulse-soft rounded-full ${s && s.openAlerts > 0 ? "bg-wine" : "bg-moss"}`}
              />
              {s && s.openAlerts > 0 ? "Attention" : "All clear"} - live
            </Pill>
            {primaryRole && <Pill tone="olive">{ROLE_LABELS[primaryRole]}</Pill>}
          </div>
        }
      />

      {/* Role-aware quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Residents"
          value={stats.isLoading ? "-" : (s?.residents ?? 0)}
          sub={primaryRole === "family" ? "Loved ones" : "In your care"}
          tone="olive"
        />
        <Stat
          label="Open alerts"
          value={stats.isLoading ? "-" : (s?.openAlerts ?? 0)}
          sub="Needs attention"
          tone={s && s.openAlerts > 0 ? "wine" : "moss"}
        />
        <Stat
          label="Tasks today"
          value={stats.isLoading ? "-" : (s?.tasksToday ?? 0)}
          sub={`${s?.tasksDone ?? 0} completed`}
          tone="gold"
        />
        <Stat
          label="Your role"
          value={primaryRole ? ROLE_LABELS[primaryRole] : "-"}
          sub={isStaff ? "Care team" : "Family member"}
          tone="terracotta"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Recent activity</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Live timeline</h3>
            </div>
            <Link to="/app/timeline" className="text-xs text-olive hover:underline">
              Open timeline
            </Link>
          </div>
          <ul className="mt-5 space-y-3">
            {recent.isLoading && <li className="text-sm text-muted-foreground">Loading live activity...</li>}
            {recent.data?.length === 0 && (
              <li>
                <EmptyState
                  title={`Welcome, ${displayName || "there"}.`}
                  hint="Activity will appear here as your team logs care, alerts and notes."
                />
              </li>
            )}
            {recent.data?.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-cream/40 p-3"
              >
                <span
                  className={`mt-1.5 h-2 w-2 flex-none rounded-full ${e.severity === "critical" ? "bg-wine" : e.severity === "warning" ? "bg-gold" : "bg-moss"}`}
                />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.occurred_at).toLocaleString()} - {e.category}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <p className="text-xs uppercase text-muted-foreground">Quick actions</p>
          <div className="mt-4 space-y-2">
            <QuickLink to="/app/residents" label="Residents" hint="Manage profiles" />
            <QuickLink to="/app/care-plan" label="Care plan" hint="Today's tasks" />
            <QuickLink to="/app/alerts" label="Alerts" hint="Resolve incidents" />
            {isAdmin && <QuickLink to="/app/tenants" label="Organization" hint="Invite members" />}
            {isSuperAdmin && (
              <QuickLink to="/app/admin" label="Super admin" hint="Platform health" />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function QuickLink({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl border border-border/60 bg-ivory px-4 py-3 hover:border-olive/40 hover:bg-cream"
    >
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
