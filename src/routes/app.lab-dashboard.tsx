import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Clock3, FlaskConical, TrendingUp } from "lucide-react";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/lab-dashboard")({ component: LabDashboard });

const STAGE_GROUPS: Array<{ label: string; stages: string[]; tone: "olive" | "gold" | "moss" | "wine" | "terracotta" }> = [
  { label: "Pré-coleta", stages: ["pedido_recebido", "cadastro_validado", "agendamento_confirmado", "paciente_identificado"], tone: "gold" },
  { label: "Coleta e transporte", stages: ["coleta_realizada", "etiqueta_vinculada", "amostra_transportada", "amostra_recebida"], tone: "olive" },
  { label: "Processamento", stages: ["triagem_tecnica", "centrifugacao", "separacao", "aliquota", "processamento", "controle_qualidade", "analise"], tone: "terracotta" },
  { label: "Validação e assinatura", stages: ["revisao", "validacao_tecnica", "validacao_clinica", "assinatura"], tone: "wine" },
  { label: "Liberação e pós", stages: ["liberacao", "comunicacao", "arquivamento", "descarte"], tone: "moss" },
];

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function LabDashboard() {
  const { profile, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const data = useQuery({
    queryKey: ["lab-dashboard", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    refetchInterval: 30000,
    queryFn: async () => {
      const db = supabase as any;
      const [samples, reports, criticals, checkins, appointments, orders, items, exams, alerts] = await Promise.all([
        db.from("samples").select("id,current_stage,status,created_at").limit(400),
        db.from("lab_reports").select("id,status,is_critical,created_at,released_at").limit(400),
        db.from("critical_results").select("id,status,created_at").neq("status", "closed"),
        db.from("checkins").select("id,status,priority,arrived_at,called_at").gte("arrived_at", startOfDay),
        db.from("appointments").select("id,status,starts_at").gte("starts_at", startOfDay).limit(300),
        db.from("exam_orders").select("id,status,total_cents,created_at").limit(400),
        db.from("exam_order_items").select("id,exam_id,order_id").limit(800),
        db.from("exam_catalog").select("id,name,commercial_name").limit(400),
        db.from("alerts").select("id,severity,status,category").eq("status", "open").limit(200),
      ]);
      const errs = [samples, reports, criticals, checkins, appointments, orders, items, exams, alerts]
        .map((r) => r.error?.message)
        .filter(Boolean);
      if (errs.length) throw new Error(errs.join(" | "));
      return {
        samples: samples.data ?? [],
        reports: reports.data ?? [],
        criticals: criticals.data ?? [],
        checkins: checkins.data ?? [],
        appointments: appointments.data ?? [],
        orders: orders.data ?? [],
        items: items.data ?? [],
        exams: exams.data ?? [],
        alerts: alerts.data ?? [],
      };
    },
  });

  const d = data.data;

  const kpis = useMemo(() => {
    if (!d) return null;
    const waiting = d.checkins.filter((c: any) => c.status === "waiting");
    const done = d.checkins.filter((c: any) => c.status === "done");
    const noShow = d.checkins.filter((c: any) => c.status === "no_show");
    const avgWait = waiting.length
      ? Math.round(waiting.reduce((acc: number, c: any) => acc + minutesSince(c.arrived_at), 0) / waiting.length)
      : 0;
    const apptToday = d.appointments.filter((a: any) => a.status !== "canceled");
    const paidOrders = d.orders.filter((o: any) => o.status === "paid");
    const revenue = paidOrders.reduce((acc: number, o: any) => acc + (o.total_cents ?? 0), 0);
    const releasedToday = d.reports.filter(
      (r: any) => r.status === "released" && r.released_at && r.released_at >= startOfDay,
    );
    return { waiting, done, noShow, avgWait, apptToday, revenue, releasedToday };
  }, [d, startOfDay]);

  const topExams = useMemo(() => {
    if (!d) return [];
    const count = new Map<string, number>();
    d.items.forEach((i: any) => {
      if (i.exam_id) count.set(i.exam_id, (count.get(i.exam_id) ?? 0) + 1);
    });
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, qty]) => {
        const e = d.exams.find((x: any) => x.id === id);
        return { name: e ? e.commercial_name || e.name : "Exame", qty };
      });
  }, [d]);

  const maxTop = Math.max(1, ...topExams.map((t) => t.qty));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central operacional do laboratório"
        subtitle="Visão em tempo real: fila, amostras por fase, laudos, críticos e vendas — atualiza a cada 30 segundos."
        action={<Pill tone={data.isError ? "wine" : "moss"}>{data.isError ? "Erro de leitura" : "Ao vivo"}</Pill>}
      />

      {data.isLoading && <p className="text-sm text-muted-foreground">Carregando indicadores...</p>}
      {data.isError && (
        <Card className="border-wine/25 bg-wine/5">
          <p className="text-sm text-wine">{(data.error as Error).message}</p>
        </Card>
      )}

      {d && kpis && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Pacientes aguardando" value={kpis.waiting.length} sub={`Espera média ${kpis.avgWait} min`} tone="gold" />
            <Stat label="Atendidos hoje" value={kpis.done.length} sub={`${kpis.noShow.length} não compareceram`} tone="moss" />
            <Stat label="Agendamentos do dia" value={kpis.apptToday.length} sub="Confirmados e agendados" tone="olive" />
            <Stat label="Receita paga" value={brl(kpis.revenue)} sub="Pedidos pagos (acumulado)" tone="wine" />
          </div>

          <Card className="space-y-3 p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FlaskConical className="h-4 w-4" /> Amostras por fase do fluxo
            </h3>
            <div className="grid gap-3 md:grid-cols-5">
              {STAGE_GROUPS.map((g) => {
                const inGroup = d.samples.filter(
                  (s: any) => s.status === "in_progress" && g.stages.includes(s.current_stage),
                ).length;
                return (
                  <div key={g.label} className="rounded-2xl border border-white/70 bg-white/50 p-4 text-center">
                    <p className="font-display text-3xl text-olive">{inGroup}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{g.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill tone="wine">
                {d.samples.filter((s: any) => s.status === "rejected").length} rejeitadas (recoleta)
              </Pill>
              <Pill tone="moss">
                {d.samples.filter((s: any) => s.status === "completed").length} concluídas
              </Pill>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4" /> Laudos
              </h3>
              {[
                { label: "Em elaboração", value: d.reports.filter((r: any) => ["draft", "review"].includes(r.status)).length, tone: "gold" as const },
                { label: "Aguardando assinatura", value: d.reports.filter((r: any) => r.status === "validated").length, tone: "olive" as const },
                { label: "Assinados (não liberados)", value: d.reports.filter((r: any) => r.status === "signed").length, tone: "terracotta" as const },
                { label: "Liberados hoje", value: kpis.releasedToday.length, tone: "moss" as const },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <Pill tone={row.tone}>{row.value}</Pill>
                </div>
              ))}
            </Card>

            <Card className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-wine" /> Atenção imediata
              </h3>
              <div className="flex items-center justify-between rounded-xl border border-wine/25 bg-wine/5 px-4 py-2.5 text-sm">
                <span className="text-wine">Resultados críticos abertos</span>
                <Pill tone="wine">{d.criticals.length}</Pill>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Alertas abertos (todas as categorias)</span>
                <Pill tone="gold">{d.alerts.length}</Pill>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Alertas críticos</span>
                <Pill tone="wine">{d.alerts.filter((a: any) => a.severity === "critical").length}</Pill>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Fila com prioridade legal</span>
                <Pill tone="terracotta">{kpis.waiting.filter((c: any) => c.priority).length}</Pill>
              </div>
            </Card>

            <Card className="space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4" /> Exames mais vendidos
              </h3>
              {topExams.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem vendas registradas ainda.</p>
              )}
              {topExams.map((t) => (
                <div key={t.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-foreground">{t.name}</span>
                    <span className="text-muted-foreground">{t.qty}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/60">
                    <div className="h-full rounded-full bg-olive" style={{ width: `${(t.qty / maxTop) * 100}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <Card className="space-y-3 p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 className="h-4 w-4" /> Pedidos e orçamentos
            </h3>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: "Carrinhos abertos", value: d.orders.filter((o: any) => o.status === "cart").length },
                { label: "Orçamentos", value: d.orders.filter((o: any) => o.status === "quote").length },
                { label: "Confirmados", value: d.orders.filter((o: any) => o.status === "ordered").length },
                { label: "Pagos", value: d.orders.filter((o: any) => o.status === "paid").length },
              ].map((row) => (
                <div key={row.label} className="rounded-2xl border border-white/70 bg-white/50 p-4 text-center">
                  <p className="font-display text-3xl text-olive">{row.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
