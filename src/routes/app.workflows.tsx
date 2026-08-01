import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/workflows")({ component: Workflows });

type WorkflowKey = "critical_alert_escalation" | "overdue_task_follow_up" | "inbox_triage";

const WORKFLOWS: { key: WorkflowKey; title: string; description: string; steps: string[] }[] = [
  {
    key: "critical_alert_escalation",
    title: "Escalonamento de alertas críticos",
    description: "Alertas abertos críticos/altos notificam toda a equipe da organização imediatamente.",
    steps: ["Find open critical alerts", "Notify team and admins", "Register auditable run"],
  },
  {
    key: "overdue_task_follow_up",
    title: "Cobrança de tarefas vencidas",
    description: "Tarefas de cuidado vencidas sobem para prioridade alta and notificam os responsáveis.",
    steps: ["Localizar tarefas vencidas", "Elevar prioridade para alta", "Notificar responsável and criador"],
  },
  {
    key: "inbox_triage",
    title: "Triagem do inbox",
    description: "Conversas abertas sem resposta há mais de 24h são marcadas como prioridade alta.",
    steps: ["Localizar conversas paradas +24h", "Elevar prioridade", "Notificar a equipe"],
  },
];

function Workflows() {
  const { profile, user, isAdmin, isSuperAdmin, hasAnyRole } = useAuth();
  const qc = useQueryClient();
  const canRun = hasAnyRole(["nurse", "doctor", "clinic_admin", "super_admin"]);
  if (!isAdmin && !isSuperAdmin && !canRun) return <Navigate to="/app" />;

  const runs = useQuery({
    queryKey: ["workflow-runs", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("workflow_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });

  const notifyStaff = async (tenantId: string, title: string, body: string, link: string) => {
    const { data: staff } = await (supabase as any)
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", tenantId)
      .in("role", ["caregiver", "nurse", "doctor", "clinic_admin"]);
    const targets = [...new Set(((staff ?? []) as any[]).map((item) => item.user_id))];
    if (targets.length === 0 && user) targets.push(user.id);
    await (supabase as any).from("notifications").insert(
      targets.map((userId) => ({ tenant_id: tenantId, user_id: userId, title, body, link, severity: "warning" })),
    );
    return targets.length;
  };

  const execute = useMutation({
    mutationFn: async (key: WorkflowKey) => {
      const tenantId = profile?.tenant_id;
      if (!tenantId && !isSuperAdmin) throw new Error("Entre em uma organização para executar automações.");
      const db = supabase as any;
      let processed = 0;
      const details: Record<string, unknown> = {};

      if (key === "critical_alert_escalation") {
        const { data: alerts, error } = await db
          .from("alerts")
          .select("id,tenant_id,title,severity")
          .eq("status", "open")
          .in("severity", ["critical", "warning"])
          .limit(100);
        if (error) throw error;
        for (const alert of alerts ?? []) {
          const notified = await notifyStaff(
            alert.tenant_id,
            `Alerta ${alert.severity === "critical" ? "crítico" : "de atenção"}: ${alert.title}`,
            "Escalonado automaticamente pelo workflow de alertas.",
            "/app/alerts",
          );
          details[alert.id] = { notified };
          processed++;
        }
      }

      if (key === "overdue_task_follow_up") {
        const { data: tasks, error } = await db
          .from("care_tasks")
          .select("id,tenant_id,title,assigned_to,created_by,due_at,priority")
          .eq("status", "pending")
          .lt("due_at", new Date().toISOString())
          .limit(100);
        if (error) throw error;
        for (const task of tasks ?? []) {
          if (task.priority !== "high") {
            await db.from("care_tasks").update({ priority: "high" }).eq("id", task.id);
          }
          const targets = [...new Set([task.assigned_to, task.created_by].filter(Boolean))];
          if (targets.length) {
            await db.from("notifications").insert(
              targets.map((userId: string) => ({
                tenant_id: task.tenant_id,
                user_id: userId,
                title: `Tarefa vencida: ${task.title}`,
                body: `Overdue at ${new Date(task.due_at).toLocaleString("pt-BR")} — priority raised to high.`,
                link: "/app/care-plan",
                severity: "warning",
              })),
            );
          }
          details[task.id] = { notified: targets.length };
          processed++;
        }
      }

      if (key === "inbox_triage") {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: threads, error } = await db
          .from("inbox_threads")
          .select("id,tenant_id,subject,priority,last_message_at")
          .eq("status", "open")
          .lt("last_message_at", cutoff)
          .limit(100);
        if (error) throw error;
        for (const thread of threads ?? []) {
          if (thread.priority !== "high") {
            await db.from("inbox_threads").update({ priority: "high" }).eq("id", thread.id);
          }
          if (thread.tenant_id) {
            await notifyStaff(
              thread.tenant_id,
              `Conversa sem resposta: ${thread.subject}`,
              "Sem resposta há mais de 24h — prioridade elevada.",
              "/app/inbox",
            );
          }
          details[thread.id] = { escalated: true };
          processed++;
        }
      }

      const { error: runError } = await db.from("workflow_runs").insert({
        tenant_id: tenantId ?? null,
        workflow_key: key,
        status: processed > 0 ? "completed" : "no_op",
        processed,
        results: details,
        executed_by: user?.id,
      });
      if (runError) throw runError;
      return { key, processed };
    },
    onSuccess: ({ processed }) => {
      toast.success(processed > 0 ? `Automação executada — ${processed} item(s) processado(s)` : "Nada pendente para processar");
      qc.invalidateQueries({ queryKey: ["workflow-runs", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Falha ao executar a automação"),
  });

  const runsFor = (key: string) => (runs.data ?? []).filter((run: any) => run.workflow_key === key);

  return (
    <>
      <PageHeader
        title="Automação de cuidados"
        subtitle="Executable workflows over real data: alerts, tasks and conversations. Every run is registered and auditable."
        action={<Pill tone="olive">Motor active</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Execuções registradas" value={runs.data?.length ?? "-"} sub="Latests 40" tone="olive" />
        <Stat
          label="Itens processados"
          value={(runs.data ?? []).reduce((total: number, run: any) => total + (run.processed ?? 0), 0)}
          sub="Total recente"
          tone="moss"
        />
        <Stat
          label="Latest run"
          value={runs.data?.[0] ? new Date(runs.data[0].created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-"}
          sub={runs.data?.[0] ? new Date(runs.data[0].created_at).toLocaleDateString("pt-BR") : "None yet"}
          tone="gold"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {WORKFLOWS.map((workflow) => {
          const history = runsFor(workflow.key);
          return (
            <Card key={workflow.key}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                  <Zap className="h-5 w-5" />
                </span>
                <Pill tone={history[0]?.status === "completed" ? "moss" : "muted"}>
                  {history.length ? `${history.length} execuções` : "nunca executado"}
                </Pill>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{workflow.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
              <ol className="mt-4 space-y-2">
                {workflow.steps.map((step, index) => (
                  <li key={step} className="flex items-center gap-2 rounded-xl bg-white/45 px-3 py-2 text-xs text-foreground/80">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-olive text-[10px] font-bold text-ivory">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              {canRun && (
                <button
                  onClick={() => execute.mutate(workflow.key)}
                  disabled={execute.isPending}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  {execute.isPending ? "Executando..." : "Executar agora"}
                </button>
              )}
              {history[0] && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Latest: {new Date(history[0].created_at).toLocaleString("pt-BR")} · {history[0].processed} item(s)
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Histórico de execuções</h2>
        {(runs.data ?? []).length === 0 ? (
          <div className="mt-4"><EmptyState title="No runs yet" hint="Run an automation above to record the first one." /></div>
        ) : (
          <div className="mt-4 space-y-2">
            {(runs.data ?? []).map((run: any) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {WORKFLOWS.find((w) => w.key === run.workflow_key)?.title ?? run.workflow_key}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={run.status === "completed" ? "moss" : run.status === "failed" ? "wine" : "muted"}>
                    {run.status === "completed" ? "concluída" : run.status === "failed" ? "falhou" : "sem pendências"}
                  </Pill>
                  <Pill tone="olive">{run.processed} item(s)</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Automatic scheduling (recurring execution via worker cron) enters the integrations phase, together with Stripe and Google APIs.
      </p>
    </>
  );
}
