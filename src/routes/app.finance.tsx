import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Landmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/finance")({ component: Finance });

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

const CATEGORIES = [
  { value: "exames", label: "Exames e serviços" },
  { value: "convenios", label: "Convênios" },
  { value: "insumos", label: "Insumos" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "pessoal", label: "Pessoal" },
  { value: "logistica", label: "Logística" },
  { value: "geral", label: "Geral" },
];

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Finance() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, isAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [tab, setTab] = useState<"receivable" | "payable">("receivable");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", category: "geral", counterparty: "", amount: "", due_date: "" });
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const tenantsList = useQuery({
    queryKey: ["fin-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const entries = useQuery({
    queryKey: ["finance-entries", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("finance_entries")
        .select("*")
        .order("due_date", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["finance-orders", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_orders")
        .select("id,status,total_cents,created_at")
        .eq("status", "paid")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["finance-entries", tenantId] });

  const save = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      if (!form.description.trim()) throw new Error("Informe a descrição.");
      const cents = Math.round(Number(form.amount.replace(",", ".")) * 100);
      if (!cents || cents <= 0) throw new Error("Informe o valor.");
      const { error } = await (supabase as any).from("finance_entries").insert({
        tenant_id: effTenant,
        kind: tab,
        description: form.description.trim(),
        category: form.category,
        counterparty: form.counterparty.trim() || null,
        amount_cents: cents,
        due_date: form.due_date || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tab === "receivable" ? "Conta a receber lançada" : "Conta a pagar lançada");
      setForm({ description: "", category: "geral", counterparty: "", amount: "", due_date: "" });
      setOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível lançar"),
  });

  const markPaid = async (entry: any) => {
    const { error } = await (supabase as any)
      .from("finance_entries")
      .update({ paid_at: new Date().toISOString() })
      .eq("id", entry.id);
    if (error) return toast.error(error.message);
    toast.success(entry.kind === "receivable" ? "Recebimento confirmado" : "Pagamento confirmado");
    refresh();
  };

  const remove = async (entry: any) => {
    if (!window.confirm("Excluir este lançamento?")) return;
    const { error } = await (supabase as any).from("finance_entries").delete().eq("id", entry.id);
    if (error) return toast.error(error.message);
    toast.success("Lançamento excluído");
    refresh();
  };

  const summary = useMemo(() => {
    const all = entries.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const ordersRevenue = (orders.data ?? []).reduce((acc: number, o: any) => acc + (o.total_cents ?? 0), 0);
    const received = all.filter((e: any) => e.kind === "receivable" && e.paid_at).reduce((a: number, e: any) => a + e.amount_cents, 0);
    const paid = all.filter((e: any) => e.kind === "payable" && e.paid_at).reduce((a: number, e: any) => a + e.amount_cents, 0);
    const toReceive = all.filter((e: any) => e.kind === "receivable" && !e.paid_at).reduce((a: number, e: any) => a + e.amount_cents, 0);
    const toPay = all.filter((e: any) => e.kind === "payable" && !e.paid_at).reduce((a: number, e: any) => a + e.amount_cents, 0);
    const overdue = all.filter((e: any) => !e.paid_at && e.due_date && e.due_date < today);
    return {
      revenue: ordersRevenue + received,
      expenses: paid,
      result: ordersRevenue + received - paid,
      toReceive,
      toPay,
      overdue,
    };
  }, [entries.data, orders.data]);

  const list = (entries.data ?? []).filter((e: any) => e.kind === tab);
  const today = new Date().toISOString().slice(0, 10);

  const exportDre = () => {
    downloadPdf("dre-care-kranich.pdf", "Demonstrativo financeiro", [
      `Emitido em: ${new Date().toLocaleString("pt-BR")}`,
      "",
      `Receita de exames pagos (pedidos): ${brl((orders.data ?? []).reduce((a: number, o: any) => a + (o.total_cents ?? 0), 0))}`,
      `Outros recebimentos confirmados: ${brl((entries.data ?? []).filter((e: any) => e.kind === "receivable" && e.paid_at).reduce((a: number, e: any) => a + e.amount_cents, 0))}`,
      `Despesas pagas: ${brl(summary.expenses)}`,
      `Resultado: ${brl(summary.result)}`,
      "",
      `A receber (aberto): ${brl(summary.toReceive)}`,
      `A pagar (aberto): ${brl(summary.toPay)}`,
      `Lançamentos vencidos: ${summary.overdue.length}`,
      "",
      "Lançamentos em aberto:",
      ...(entries.data ?? [])
        .filter((e: any) => !e.paid_at)
        .map(
          (e: any) =>
            `- ${e.kind === "receivable" ? "RECEBER" : "PAGAR"} · ${e.description} · ${brl(e.amount_cents)}${e.due_date ? ` · vence ${new Date(e.due_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}`,
        ),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle="Contas a pagar e receber, inadimplência, receita de exames e demonstrativo — PIX, cartão e boleto entram na fase de integrações."
        action={
          <div className="flex gap-2">
            <button onClick={exportDre} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
              <FileDown className="h-3.5 w-3.5" /> Demonstrativo PDF
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Novo lançamento
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Receita confirmada" value={brl(summary.revenue)} sub="Pedidos pagos + recebimentos" tone="moss" />
        <Stat label="Despesas pagas" value={brl(summary.expenses)} sub="Saídas confirmadas" tone="wine" />
        <Stat label="Resultado" value={brl(summary.result)} sub="Receita menos despesas" tone="olive" />
        <Stat label="Vencidos" value={summary.overdue.length} sub={`${brl(summary.overdue.reduce((a: number, e: any) => a + e.amount_cents, 0))} em atraso`} tone="terracotta" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab("receivable")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            tab === "receivable" ? "bg-olive text-ivory shadow-soft" : "border border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
          }`}
        >
          A receber · {brl(summary.toReceive)}
        </button>
        <button
          onClick={() => setTab("payable")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            tab === "payable" ? "bg-olive text-ivory shadow-soft" : "border border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
          }`}
        >
          A pagar · {brl(summary.toPay)}
        </button>
      </div>

      {open && (
        <Card className="space-y-3 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Landmark className="h-4 w-4" /> {tab === "receivable" ? "Nova conta a receber" : "Nova conta a pagar"}
          </h3>
          <div className="grid gap-3 md:grid-cols-4">
            <input className={`${glassInput} md:col-span-2`} placeholder="Descrição *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <GlassSelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
            <input className={glassInput} placeholder={tab === "receivable" ? "Pagador (convênio, empresa...)" : "Fornecedor"} value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} />
            <input className={glassInput} placeholder="Valor (R$) *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Vencimento</p>
              <GlassDatePicker value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
              {save.isPending ? "Lançando..." : "Lançar"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <EmptyState
          title={tab === "receivable" ? "Nenhuma conta a receber" : "Nenhuma conta a pagar"}
          hint="A receita dos pedidos de exames pagos já entra automaticamente no demonstrativo."
        />
      ) : (
        <Card className="space-y-2 p-5">
          {list.map((e: any) => {
            const overdue = !e.paid_at && e.due_date && e.due_date < today;
            return (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}
                    {e.counterparty ? ` · ${e.counterparty}` : ""}
                    {e.due_date ? ` · vence ${new Date(e.due_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base text-olive">{brl(e.amount_cents)}</span>
                  {e.paid_at ? (
                    <Pill tone="moss">{e.kind === "receivable" ? "recebido" : "pago"}</Pill>
                  ) : (
                    <>
                      {overdue && <Pill tone="wine">vencido</Pill>}
                      <button onClick={() => markPaid(e)} className="rounded-full bg-olive px-3 py-1.5 text-xs font-medium text-ivory">
                        {e.kind === "receivable" ? "Confirmar recebimento" : "Confirmar pagamento"}
                      </button>
                    </>
                  )}
                  <button onClick={() => remove(e)} className="rounded-full border border-wine/30 bg-wine/5 p-1.5 text-wine">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
