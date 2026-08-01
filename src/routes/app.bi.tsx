import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/bi")({ component: BI });

const METRICS = [
  { value: "exames_mes", label: "Exames realizados no mês" },
  { value: "receita_mes", label: "Receita paga no mês (R$)" },
  { value: "pacientes_novos", label: "Novos pacientes no mês" },
  { value: "laudos_liberados", label: "Laudos liberados no mês" },
  { value: "taxa_no_show", label: "Taxa de não comparecimento (%)" },
  { value: "recoletas", label: "Recoletas (amostras rejeitadas)" },
  { value: "ticket_medio", label: "Ticket médio (R$)" },
];

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function BI() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, isAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [goal, setGoal] = useState({ metric: "exames_mes", target: "" });
  const [open, setOpen] = useState(false);
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const tenantsList = useQuery({
    queryKey: ["bi-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const data = useQuery({
    queryKey: ["bi-data", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    refetchInterval: 60000,
    queryFn: async () => {
      const db = supabase as any;
      const [orders, items, patients, reports, samples, checkins, appointments, exams, criticals] = await Promise.all([
        db.from("exam_orders").select("id,status,total_cents,created_at").limit(600),
        db.from("exam_order_items").select("id,exam_id,order_id,created_at").limit(1200),
        db.from("patients").select("id,created_at").limit(1000),
        db.from("lab_reports").select("id,status,released_at,created_at,is_critical").limit(600),
        db.from("samples").select("id,status,created_at").limit(600),
        db.from("checkins").select("id,status,arrived_at").limit(600),
        db.from("appointments").select("id,status,starts_at").limit(600),
        db.from("exam_catalog").select("id,name,commercial_name,price_cents").limit(400),
        db.from("critical_results").select("id,status").limit(300),
      ]);
      const errs = [orders, items, patients, reports, samples, checkins, appointments, exams, criticals]
        .map((r) => r.error?.message)
        .filter(Boolean);
      if (errs.length) throw new Error(errs.join(" | "));
      return {
        orders: orders.data ?? [],
        items: items.data ?? [],
        patients: patients.data ?? [],
        reports: reports.data ?? [],
        samples: samples.data ?? [],
        checkins: checkins.data ?? [],
        appointments: appointments.data ?? [],
        exams: exams.data ?? [],
        criticals: criticals.data ?? [],
      };
    },
  });

  const goals = useQuery({
    queryKey: ["business-goals", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("business_goals").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const d = data.data;

  const metrics = useMemo(() => {
    if (!d) return null;
    const inMonth = (iso: string | null) => !!iso && iso >= monthStart;
    const paidMonth = d.orders.filter((o: any) => o.status === "paid" && inMonth(o.created_at));
    const revenue = paidMonth.reduce((a: number, o: any) => a + (o.total_cents ?? 0), 0);
    const itemsMonth = d.items.filter((i: any) => inMonth(i.created_at));
    const checkinsMonth = d.checkins.filter((c: any) => inMonth(c.arrived_at));
    const noShow = checkinsMonth.filter((c: any) => c.status === "no_show").length;
    return {
      exames_mes: itemsMonth.length,
      receita_mes: revenue / 100,
      pacientes_novos: d.patients.filter((p: any) => inMonth(p.created_at)).length,
      laudos_liberados: d.reports.filter((r: any) => r.status === "released" && inMonth(r.released_at)).length,
      taxa_no_show: checkinsMonth.length ? Math.round((noShow / checkinsMonth.length) * 100) : 0,
      recoletas: d.samples.filter((s: any) => s.status === "rejected" && inMonth(s.created_at)).length,
      ticket_medio: paidMonth.length ? revenue / paidMonth.length / 100 : 0,
      criticalsOpen: d.criticals.filter((c: any) => c.status !== "closed").length,
      revenueCents: revenue,
    };
  }, [d, monthStart]);

  const topExams = useMemo(() => {
    if (!d) return [];
    const count = new Map<string, number>();
    d.items.forEach((i: any) => {
      if (i.exam_id) count.set(i.exam_id, (count.get(i.exam_id) ?? 0) + 1);
    });
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, qty]) => {
        const e = d.exams.find((x: any) => x.id === id);
        return { name: e ? e.commercial_name || e.name : "Exame", qty, revenue: (e?.price_cents ?? 0) * qty };
      });
  }, [d]);

  const maxTop = Math.max(1, ...topExams.map((t) => t.qty));

  const saveGoal = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      const target = Number(goal.target.replace(",", "."));
      if (!target || target <= 0) throw new Error("Informe a meta.");
      const label = METRICS.find((m) => m.value === goal.metric)?.label ?? goal.metric;
      const { error } = await (supabase as any).from("business_goals").insert({
        tenant_id: effTenant,
        metric: goal.metric,
        label,
        target,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta definida");
      setGoal({ metric: "exames_mes", target: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["business-goals", tenantId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeGoal = async (id: string) => {
    const { error } = await (supabase as any).from("business_goals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["business-goals", tenantId] });
  };

  const exportPdf = () => {
    if (!metrics) return;
    downloadPdf("bi-care-kranich.pdf", "Painel executivo — mês corrente", [
      `Emitido em: ${new Date().toLocaleString("pt-BR")}`,
      "",
      `Exames realizados: ${metrics.exames_mes}`,
      `Receita paga: ${brl(metrics.revenueCents)}`,
      `Ticket médio: ${metrics.ticket_medio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      `Novos pacientes: ${metrics.pacientes_novos}`,
      `Laudos liberados: ${metrics.laudos_liberados}`,
      `Taxa de não comparecimento: ${metrics.taxa_no_show}%`,
      `Recoletas: ${metrics.recoletas}`,
      `Resultados críticos em aberto: ${metrics.criticalsOpen}`,
      "",
      "Metas:",
      ...(goals.data ?? []).map((g: any) => {
        const current = (metrics as any)[g.metric] ?? 0;
        const pct = g.target ? Math.round((current / Number(g.target)) * 100) : 0;
        return `- ${g.label}: ${current} de ${g.target} (${pct}%)`;
      }),
      "",
      "Exames mais vendidos:",
      ...topExams.map((t) => `- ${t.name}: ${t.qty}`),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="BI executivo"
        subtitle="Indicadores operacionais, clínicos e financeiros do mês com acompanhamento de metas."
        action={
          <div className="flex gap-2">
            <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
              <FileDown className="h-3.5 w-3.5" /> Relatório PDF
            </button>
            <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90">
              <Plus className="h-4 w-4" /> Nova meta
            </button>
          </div>
        }
      />

      {data.isLoading && <p className="text-sm text-muted-foreground">Calculando indicadores...</p>}
      {data.isError && (
        <Card className="border-wine/25 bg-wine/5">
          <p className="text-sm text-wine">{(data.error as Error).message}</p>
        </Card>
      )}

      {open && (
        <Card className="space-y-3 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4" /> Definir meta do mês
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <GlassSelect value={goal.metric} onChange={(v) => setGoal({ ...goal, metric: v })} options={METRICS} />
            <input className={glassInput} placeholder="Meta (número)" inputMode="decimal" value={goal.target} onChange={(e) => setGoal({ ...goal, target: e.target.value })} />
            <button onClick={() => saveGoal.mutate()} disabled={saveGoal.isPending} className="rounded-2xl bg-olive px-4 py-2.5 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
              Salvar meta
            </button>
          </div>
        </Card>
      )}

      {metrics && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Exames no mês" value={metrics.exames_mes} sub="Itens de pedidos" tone="olive" />
            <Stat label="Receita paga" value={brl(metrics.revenueCents)} sub={`Ticket médio ${metrics.ticket_medio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`} tone="moss" />
            <Stat label="Novos pacientes" value={metrics.pacientes_novos} sub="Cadastrados no mês" tone="gold" />
            <Stat label="Laudos liberados" value={metrics.laudos_liberados} sub="No mês" tone="wine" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-3 p-6">
              <h3 className="text-sm font-semibold text-foreground">Qualidade e operação</h3>
              {[
                { label: "Taxa de não comparecimento", value: `${metrics.taxa_no_show}%`, tone: metrics.taxa_no_show > 15 ? ("wine" as const) : ("moss" as const) },
                { label: "Recoletas no mês", value: metrics.recoletas, tone: metrics.recoletas > 0 ? ("gold" as const) : ("moss" as const) },
                { label: "Críticos em aberto", value: metrics.criticalsOpen, tone: metrics.criticalsOpen > 0 ? ("wine" as const) : ("moss" as const) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <Pill tone={row.tone}>{row.value}</Pill>
                </div>
              ))}
            </Card>

            <Card className="space-y-3 p-6 lg:col-span-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Target className="h-4 w-4" /> Metas do mês
              </h3>
              {(goals.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma meta definida ainda. Crie metas para acompanhar o desempenho.</p>
              )}
              {(goals.data ?? []).map((g: any) => {
                const current = Number((metrics as any)[g.metric] ?? 0);
                const target = Number(g.target);
                const pct = target ? Math.min(150, Math.round((current / target) * 100)) : 0;
                const good = pct >= 100;
                return (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{g.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {current.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} / {target.toLocaleString("pt-BR")}
                        </span>
                        <Pill tone={good ? "moss" : pct >= 60 ? "gold" : "wine"}>{pct}%</Pill>
                        <button onClick={() => removeGoal(g.id)} className="text-wine">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/60">
                      <div
                        className={`h-full rounded-full ${good ? "bg-moss" : pct >= 60 ? "bg-gold" : "bg-wine"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          <Card className="space-y-3 p-6">
            <h3 className="text-sm font-semibold text-foreground">Exames mais vendidos</h3>
            {topExams.length === 0 ? (
              <EmptyState title="Sem vendas registradas" hint="Os exames aparecem aqui conforme os pedidos forem criados." />
            ) : (
              topExams.map((t) => (
                <div key={t.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-foreground">{t.name}</span>
                    <span className="text-muted-foreground">{t.qty} · {brl(t.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/60">
                    <div className="h-full rounded-full bg-olive" style={{ width: `${(t.qty / maxTop) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
