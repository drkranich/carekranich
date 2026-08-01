import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, FileDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/inventory")({ component: Inventory });

const CATEGORIES = [
  { value: "material", label: "Material de coleta" },
  { value: "reagente", label: "Reagentes" },
  { value: "kit", label: "Kits" },
  { value: "epi", label: "EPIs" },
  { value: "embalagem", label: "Embalagens / transporte" },
  { value: "descartavel", label: "Descartáveis" },
];

const MOVE_KINDS = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída / consumo" },
  { value: "perda", label: "Perda" },
  { value: "descarte", label: "Descarte" },
  { value: "transferencia", label: "Transferência" },
];

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

const EMPTY = {
  name: "",
  category: "material",
  lot: "",
  expiry_date: "",
  supplier: "",
  quantity: "",
  min_quantity: "",
  unit_label: "un",
  cost: "",
};

function daysTo(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000);
}

function Inventory() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [move, setMove] = useState({ kind: "saida", quantity: "", notes: "" });
  const [filter, setFilter] = useState("all");

  const tenantsList = useQuery({
    queryKey: ["inv-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const items = useQuery({
    queryKey: ["inventory-items", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["inventory-items", tenantId] });

  const save = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      if (form.name.trim().length < 2) throw new Error("Informe o nome do insumo.");
      const { error } = await (supabase as any).from("inventory_items").insert({
        tenant_id: effTenant,
        name: form.name.trim(),
        category: form.category,
        lot: form.lot.trim() || null,
        expiry_date: form.expiry_date || null,
        supplier: form.supplier.trim() || null,
        quantity: form.quantity ? Number(form.quantity.replace(",", ".")) : 0,
        min_quantity: form.min_quantity ? Number(form.min_quantity.replace(",", ".")) : 0,
        unit_label: form.unit_label.trim() || "un",
        cost_cents: form.cost ? Math.round(Number(form.cost.replace(",", ".")) * 100) : 0,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insumo cadastrado");
      setForm({ ...EMPTY });
      setOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível salvar"),
  });

  const registerMove = useMutation({
    mutationFn: async () => {
      const item = (items.data ?? []).find((i: any) => i.id === moveFor);
      if (!item) throw new Error("Selecione o insumo.");
      const qty = Number(move.quantity.replace(",", "."));
      if (!qty || qty <= 0) throw new Error("Informe a quantidade.");
      const delta = move.kind === "entrada" ? qty : -qty;
      const newQty = Number(item.quantity) + delta;
      if (newQty < 0) throw new Error("Quantidade insuficiente em estoque.");
      const { error } = await (supabase as any).from("inventory_moves").insert({
        tenant_id: item.tenant_id,
        item_id: item.id,
        kind: move.kind,
        quantity: qty,
        notes: move.notes.trim() || null,
        performed_by: user?.id ?? null,
      });
      if (error) throw error;
      const { error: e2 } = await (supabase as any)
        .from("inventory_items")
        .update({ quantity: newQty })
        .eq("id", item.id);
      if (e2) throw e2;
      if (newQty <= Number(item.min_quantity) && delta < 0) {
        await (supabase as any).from("alerts").insert({
          tenant_id: item.tenant_id,
          title: `Estoque baixo — ${item.name}`,
          description: `Restam ${newQty} ${item.unit_label} (mínimo: ${item.min_quantity}). Programar reposição.`,
          severity: "high",
          category: "inventory",
          status: "open",
          created_by: user?.id ?? null,
        });
        return "low";
      }
      return "ok";
    },
    onSuccess: (flag) => {
      toast.success(flag === "low" ? "Movimentação registrada — alerta de reposição criado" : "Movimentação registrada");
      setMove({ kind: "saida", quantity: "", notes: "" });
      setMoveFor(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const all = items.data ?? [];
    if (filter === "all") return all;
    if (filter === "low") return all.filter((i: any) => Number(i.quantity) <= Number(i.min_quantity));
    if (filter === "expiring") {
      return all.filter((i: any) => {
        const d = daysTo(i.expiry_date);
        return d !== null && d <= 30;
      });
    }
    return all.filter((i: any) => i.category === filter);
  }, [items.data, filter]);

  const stats = useMemo(() => {
    const all = items.data ?? [];
    return {
      total: all.length,
      low: all.filter((i: any) => Number(i.quantity) <= Number(i.min_quantity)).length,
      expiring: all.filter((i: any) => {
        const d = daysTo(i.expiry_date);
        return d !== null && d <= 30 && d >= 0;
      }).length,
      expired: all.filter((i: any) => {
        const d = daysTo(i.expiry_date);
        return d !== null && d < 0;
      }).length,
    };
  }, [items.data]);

  const exportPdf = () => {
    downloadPdf("inventario-insumos.pdf", "Inventário de insumos", [
      `Emitido em: ${new Date().toLocaleString("pt-BR")}`,
      "",
      ...(items.data ?? []).map((i: any) => {
        const d = daysTo(i.expiry_date);
        return `- ${i.name} (${CATEGORIES.find((c) => c.value === i.category)?.label ?? i.category}) · ${i.quantity} ${i.unit_label} · mínimo ${i.min_quantity}${i.lot ? ` · lote ${i.lot}` : ""}${i.expiry_date ? ` · validade ${new Date(i.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")}${d !== null && d < 0 ? " (VENCIDO)" : ""}` : ""}`;
      }),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque e insumos"
        subtitle="Tubos, reagentes, kits, EPIs e materiais com lote, validade, estoque mínimo e alerta automático de reposição."
        action={
          <div className="flex gap-2">
            <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
              <FileDown className="h-3.5 w-3.5" /> Inventário PDF
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Novo insumo
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Itens cadastrados" value={stats.total} sub="No inventário" tone="olive" />
        <Stat label="Estoque baixo" value={stats.low} sub="No mínimo ou abaixo" tone="wine" />
        <Stat label="Vencendo em 30 dias" value={stats.expiring} sub="Priorizar uso" tone="gold" />
        <Stat label="Vencidos" value={stats.expired} sub="Descartar" tone="terracotta" />
      </div>

      {open && (
        <Card className="space-y-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">Novo insumo</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <input className={`${glassInput} md:col-span-2`} placeholder="Nome (ex.: Tubo EDTA 4mL) *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <GlassSelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
            <input className={glassInput} placeholder="Fornecedor" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            <input className={glassInput} placeholder="Lote" value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Validade</p>
              <GlassDatePicker value={form.expiry_date} onChange={(v) => setForm({ ...form, expiry_date: v })} />
            </div>
            <input className={glassInput} placeholder="Quantidade inicial" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <input className={glassInput} placeholder="Estoque mínimo" inputMode="decimal" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} />
            <input className={glassInput} placeholder="Unidade (un, cx, mL...)" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} />
            <input className={glassInput} placeholder="Custo unitário (R$)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
              {save.isPending ? "Salvando..." : "Cadastrar insumo"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
              Cancelar
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Todos" },
          { value: "low", label: "Estoque baixo" },
          { value: "expiring", label: "Vencendo" },
          ...CATEGORIES,
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f.value
                ? "bg-olive text-ivory shadow-soft"
                : "border border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum insumo neste filtro" hint="Cadastre tubos, reagentes, kits e EPIs para controlar o estoque." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((i: any) => {
            const d = daysTo(i.expiry_date);
            const low = Number(i.quantity) <= Number(i.min_quantity);
            return (
              <Card key={i.id} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/15 text-olive">
                      <Boxes className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORIES.find((c) => c.value === i.category)?.label ?? i.category}
                        {i.supplier ? ` · ${i.supplier}` : ""}
                      </p>
                    </div>
                  </div>
                  <Pill tone={low ? "wine" : "moss"}>
                    {i.quantity} {i.unit_label}
                  </Pill>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Pill tone="muted">mín. {i.min_quantity}</Pill>
                  {i.lot && <Pill tone="muted">lote {i.lot}</Pill>}
                  {i.expiry_date && (
                    <Pill tone={d !== null && d < 0 ? "terracotta" : d !== null && d <= 30 ? "gold" : "muted"}>
                      {d !== null && d < 0 ? "vencido" : `validade ${new Date(i.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                    </Pill>
                  )}
                </div>

                {moveFor === i.id ? (
                  <div className="space-y-2 rounded-2xl border border-white/70 bg-white/45 p-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <GlassSelect value={move.kind} onChange={(v) => setMove({ ...move, kind: v })} options={MOVE_KINDS} />
                      <input className={glassInput} placeholder={`Quantidade (${i.unit_label})`} inputMode="decimal" value={move.quantity} onChange={(e) => setMove({ ...move, quantity: e.target.value })} />
                    </div>
                    <input className={glassInput} placeholder="Observação (destino, motivo...)" value={move.notes} onChange={(e) => setMove({ ...move, notes: e.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => registerMove.mutate()} disabled={registerMove.isPending} className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory disabled:opacity-60">
                        Registrar
                      </button>
                      <button onClick={() => setMoveFor(null)} className="rounded-full border border-border px-4 py-1.5 text-xs">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setMoveFor(i.id)} className="rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-xs backdrop-blur-xl hover:bg-white/80">
                    Movimentar estoque
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
