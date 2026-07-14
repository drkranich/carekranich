import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Workflow } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/workflows")({ component: Workflows });

function Workflows() {
  const { profile, isSuperAdmin } = useAuth();

  const ops = useQuery({
    queryKey: ["workflow-live-inputs", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [alerts, tasks, threads, events] = await Promise.all([
        db.from("alerts").select("id,title,category,severity,status,created_at").order("created_at", { ascending: false }).limit(200),
        db.from("care_tasks").select("id,title,category,priority,status,due_at,created_at").order("created_at", { ascending: false }).limit(300),
        db.from("inbox_threads").select("id,subject,source,status,priority,last_message_at").order("last_message_at", { ascending: false }).limit(100),
        db.from("events").select("id,title,category,severity,occurred_at,created_at").order("occurred_at", { ascending: false }).limit(200),
      ]);
      const errors = [alerts, tasks, threads, events].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return {
        alerts: alerts.data ?? [],
        tasks: tasks.data ?? [],
        threads: threads.data ?? [],
        events: events.data ?? [],
      };
    },
  });

  const candidates = useMemo(() => {
    const data = ops.data;
    if (!data) return [];
    const openCriticalAlerts = data.alerts.filter((item: any) => !["resolved", "closed"].includes(item.status) && ["critical", "high"].includes(item.severity));
    const overdueTasks = data.tasks.filter((item: any) => !["completed", "cancelled"].includes(item.status) && item.due_at && new Date(item.due_at).getTime() < Date.now());
    const openInbox = data.threads.filter((item: any) => item.status !== "closed");
    return [
      {
        name: "Critical alert escalation",
        trigger: "Open critical/high alerts",
        count: openCriticalAlerts.length,
        source: "alerts",
        steps: ["Acknowledge alert", "Assign owner", "Notify family", "Resolve with event record"],
      },
      {
        name: "Overdue task follow-up",
        trigger: "Care tasks past due",
        count: overdueTasks.length,
        source: "care_tasks",
        steps: ["Review overdue task", "Message assignee", "Escalate to admin", "Update care plan"],
      },
      {
        name: "Inbox triage",
        trigger: "Open user/client conversations",
        count: openInbox.length,
        source: "inbox_threads",
        steps: ["Classify priority", "Assign thread", "Reply", "Close or escalate"],
      },
    ];
  }, [ops.data]);

  return (
    <>
      <PageHeader
        title="Care automation"
        subtitle="Workflow candidates derived from live records, ready for execution history and automation policies."
        action={<Pill tone={ops.isError ? "wine" : "olive"}>{ops.isError ? "Read error" : "Live inputs"}</Pill>}
      />

      {ops.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading workflow inputs...</p>
      ) : ops.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load workflow inputs.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(ops.error as Error).message}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Alerts" value={ops.data?.alerts.length ?? 0} sub="Workflow input" tone="wine" />
            <Stat label="Tasks" value={ops.data?.tasks.length ?? 0} sub="Workflow input" tone="gold" />
            <Stat label="Threads" value={ops.data?.threads.length ?? 0} sub="Workflow input" tone="olive" />
            <Stat label="Events" value={ops.data?.events.length ?? 0} sub="Audit context" tone="moss" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {candidates.map((workflow) => (
              <Card key={workflow.name}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                    <Workflow className="h-5 w-5" />
                  </span>
                  <Pill tone={workflow.count > 0 ? "gold" : "muted"}>{workflow.count} records</Pill>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">{workflow.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{workflow.trigger}</p>
                <div className="mt-5 space-y-2">
                  {workflow.steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-cream/40 px-3 py-2 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-olive text-xs text-ivory">{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">Source: {workflow.source}</p>
              </Card>
            ))}
          </div>

          {candidates.every((item) => item.count === 0) && (
            <div className="mt-6">
              <EmptyState title="No workflow pressure right now" hint="When alerts, overdue tasks or open conversations exist, automation candidates will appear here." />
            </div>
          )}

          <Card className="mt-6">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-olive" />
              <p className="text-sm text-muted-foreground">
                To make workflows executable, the next backend step is a `workflow_definitions` and `workflow_runs` schema with server-side jobs.
              </p>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
