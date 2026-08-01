import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/orders")({ component: Orders });

type OrderRow = {
  id: string;
  tenant_id: string;
  patient_id: string | null;
  origin: string;
  status: string;
  doctor_name: string | null;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

type ItemRow = {
  id: string;
  order_id: string;
  exam_id: string | null;
  panel_id: string | null;
  price_cents: number;
  covered_by_insurance: boolean;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  cart: "Carrinho",
  quote: "Quote",
  ordered: "Pedido confirmado",
  paid: "Pago",
  canceled: "Cancelado",
};

const STATUS_TONE: Record<string, "moss" | "gold" | "olive" | "wine" | "muted"> = {
  cart: "gold",
  quote: "olive",
  ordered: "moss",
  paid: "moss",
  canceled: "wine",
};

function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Orders() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newPatientId, setNewPatientId] = useState("");
  const [addExamId, setAddExamId] = useState("");
  const [discount, setDiscount] = useState("");

  const tenantsList = useQuery({
    queryKey: ["orders-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["orders-patients", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("id,full_name,social_name,insurance_plan")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const exams = useQuery({
    queryKey: ["orders-exams", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name,category,price_cents,fasting_hours,requires_screening,preparation,turnaround_days")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["exam-orders", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const items = useQuery({
    queryKey: ["exam-order-items", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_order_items")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["exam-orders", tenantId] });
    qc.invalidateQueries({ queryKey: ["exam-order-items", tenantId] });
  };

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x: any) => x.id === id);
    return p ? p.social_name || p.full_name : "Patient not linked";
  };
  const patientInsurance = (id: string | null) =>
    (patients.data ?? []).find((x: any) => x.id === id)?.insurance_plan ?? null;

  const examOf = (id: string | null) => (exams.data ?? []).find((x: any) => x.id === id) ?? null;
  const itemsOf = (orderId: string) => (items.data ?? []).filter((i) => i.order_id === orderId);

  const selectedOrder =
    (orders.data ?? []).find((o) => o.id === selectedOrderId) ?? (orders.data ?? [])[0] ?? null;

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("No organization available.");
      if (!newPatientId) throw new Error("Select the order patient.");
      const { data, error } = await (supabase as any)
        .from("exam_orders")
        .insert({ tenant_id: effTenant, patient_id: newPatientId, origin: "reception", created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Cart created - add exams");
      setNewPatientId("");
      setSelectedOrderId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not create the order"),
  });

  const recalc = async (orderId: string, discountCents?: number) => {
    const list = itemsOf(orderId);
    const subtotal = list.reduce((acc, i) => acc + (i.covered_by_insurance ? 0 : i.price_cents), 0);
    const disc = discountCents ?? (orders.data ?? []).find((o) => o.id === orderId)?.discount_cents ?? 0;
    const total = Math.max(0, subtotal - disc);
    await (supabase as any)
      .from("exam_orders")
      .update({ subtotal_cents: subtotal, discount_cents: disc, total_cents: total })
      .eq("id", orderId);
    refresh();
  };

  const addItem = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("Create or select an order first.");
      if (!addExamId) throw new Error("Choose the exam.");
      const exam = examOf(addExamId);
      const duplicated = itemsOf(selectedOrder.id).some((i) => i.exam_id === addExamId);
      if (duplicated) throw new Error("This exam is already in this patient cart.");
      const { error } = await (supabase as any).from("exam_order_items").insert({
        order_id: selectedOrder.id,
        tenant_id: selectedOrder.tenant_id,
        exam_id: addExamId,
        price_cents: exam?.price_cents ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setAddExamId("");
      qc.invalidateQueries({ queryKey: ["exam-order-items", tenantId] });
      toast.success("Exam adicionado");
      setTimeout(() => selectedOrder && recalc(selectedOrder.id), 400);
    },
    onError: (e: any) => toast.error(e.message ?? "Could not add"),
  });

  const removeItem = async (item: ItemRow) => {
    const { error } = await (supabase as any).from("exam_order_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["exam-order-items", tenantId] });
    setTimeout(() => recalc(item.order_id), 400);
  };

  const toggleInsurance = async (item: ItemRow) => {
    const { error } = await (supabase as any)
      .from("exam_order_items")
      .update({ covered_by_insurance: !item.covered_by_insurance })
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["exam-order-items", tenantId] });
    setTimeout(() => recalc(item.order_id), 400);
  };

  const applyDiscount = async () => {
    if (!selectedOrder) return;
    const cents = discount ? Math.round(Number(discount.replace(",", ".")) * 100) : 0;
    if (Number.isNaN(cents) || cents < 0) return toast.error("Invalid discount.");
    await recalc(selectedOrder.id, cents);
    setDiscount("");
    toast.success("Desconto aplicado");
  };

  const setStatus = async (order: OrderRow, status: string) => {
    const { error } = await (supabase as any).from("exam_orders").update({ status }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(`Pedido: ${STATUS_LABEL[status] ?? status}`);
    refresh();
  };

  const prepWarnings = useMemo(() => {
    if (!selectedOrder) return [];
    const list = itemsOf(selectedOrder.id)
      .map((i) => examOf(i.exam_id))
      .filter(Boolean) as any[];
    const warnings: string[] = [];
    const fasting = list.filter((e) => e.fasting_hours);
    if (fasting.length > 1) {
      const max = Math.max(...fasting.map((e) => e.fasting_hours));
      warnings.push(`Combined preparation: use the longest fasting period (${max}h) for single collection.`);
    } else if (fasting.length === 1) {
      warnings.push(`Fasting required: ${fasting[0].fasting_hours}h (${fasting[0].commercial_name || fasting[0].name}).`);
    }
    const screening = list.filter((e) => e.requires_screening);
    if (screening.length) {
      warnings.push(`Require pre-screening: ${screening.map((e) => e.commercial_name || e.name).join(", ")}.`);
    }
    return warnings;
  }, [selectedOrder, items.data, exams.data]);

  const exportQuote = (order: OrderRow) => {
    const list = itemsOf(order.id);
    const lines: string[] = [
      `Patient: ${patientName(order.patient_id)}`,
      `Insurance: ${patientInsurance(order.patient_id) ?? "Private"}`,
      `Status: ${STATUS_LABEL[order.status] ?? order.status}`,
      `Date: ${new Date(order.created_at).toLocaleString("pt-BR")}`,
      "",
      "Exams:",
      ...list.map((i) => {
        const exam = examOf(i.exam_id);
        const name = exam ? exam.commercial_name || exam.name : "Exam";
        return `- ${name} ... ${i.covered_by_insurance ? "covered by insurance" : brl(i.price_cents)}`;
      }),
      "",
      `Subtotal (particular): ${brl(order.subtotal_cents)}`,
      `Desconto: ${brl(order.discount_cents)}`,
      `Total a pagar: ${brl(order.total_cents)}`,
      "",
      "Quote válido por 15 days. Care Kranich.",
    ];
    downloadPdf(`quote-${patientName(order.patient_id)}.pdf`, "Exam quote", lines);
  };

  const stats = useMemo(() => {
    const all = orders.data ?? [];
    return {
      carts: all.filter((o) => o.status === "cart").length,
      quotes: all.filter((o) => o.status === "quote").length,
      confirmed: all.filter((o) => ["ordered", "paid"].includes(o.status)).length,
      revenue: all.filter((o) => o.status === "paid").reduce((acc, o) => acc + o.total_cents, 0),
    };
  }, [orders.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders and quotes"
        subtitle="Exam cart by patient: duplicate blocking, combined preparation, insurance vs private and PDF quotes."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Carrinhos abertos" value={stats.carts} sub="Em montagem" tone="gold" />
        <Stat label="Quotes" value={stats.quotes} sub="Awaiting decision" tone="olive" />
        <Stat label="Confirmed orders" value={stats.confirmed} sub="Confirmed + paid" tone="moss" />
        <Stat label="Receita paga" value={brl(stats.revenue)} sub="Pedidos pagos" tone="wine" />
      </div>

      <Card className="space-y-3 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShoppingCart className="h-4 w-4" /> New cart
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <GlassSelect
            value={newPatientId}
            onChange={setNewPatientId}
            placeholder="Select patient"
            className="min-w-72"
            options={(patients.data ?? []).map((p: any) => ({
              value: p.id,
              label: `${p.social_name || p.full_name}${p.insurance_plan ? ` · ${p.insurance_plan}` : ""}`,
            }))}
          />
          <button
            onClick={() => createOrder.mutate()}
            disabled={createOrder.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Open cart
          </button>
          <p className="text-xs text-muted-foreground">
            Register the patient in "Patients" if they do not exist yet.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Pedidos recentes</h3>
          {(orders.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          )}
          {(orders.data ?? []).map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selectedOrder?.id === order.id
                  ? "border-olive/60 bg-olive/10"
                  : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{patientName(order.patient_id)}</p>
                <Pill tone={STATUS_TONE[order.status] ?? "muted"}>{STATUS_LABEL[order.status] ?? order.status}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {itemsOf(order.id).length} exam(s) · {brl(order.total_cents)} ·{" "}
                {new Date(order.created_at).toLocaleDateString("pt-BR")}
              </p>
            </button>
          ))}
        </Card>

        {selectedOrder ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{patientName(selectedOrder.patient_id)}</h3>
                <p className="text-xs text-muted-foreground">
                  {patientInsurance(selectedOrder.patient_id)
                    ? `Insurance: ${patientInsurance(selectedOrder.patient_id)}`
                    : "Private"}{" "}
                  · criado em {new Date(selectedOrder.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Pill tone={STATUS_TONE[selectedOrder.status] ?? "muted"}>
                {STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status}
              </Pill>
            </div>

            {["cart", "quote"].includes(selectedOrder.status) && (
              <div className="flex flex-wrap items-center gap-2">
                <GlassSelect
                  value={addExamId}
                  onChange={setAddExamId}
                  placeholder="Add exam to cart"
                  className="min-w-72 flex-1"
                  options={(exams.data ?? []).map((e: any) => ({
                    value: e.id,
                    label: `${e.commercial_name || e.name} · ${brl(e.price_cents)}`,
                  }))}
                />
                <button
                  onClick={() => addItem.mutate()}
                  disabled={addItem.isPending}
                  className="rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                >
                  Adicionar
                </button>
              </div>
            )}

            <div className="space-y-2">
              {itemsOf(selectedOrder.id).length === 0 && (
                <p className="text-sm text-muted-foreground">Empty cart - add exams above.</p>
              )}
              {itemsOf(selectedOrder.id).map((item) => {
                const exam = examOf(item.exam_id);
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {exam ? exam.commercial_name || exam.name : "Exam removed from catalog"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exam?.turnaround_days ? `Result in ${exam.turnaround_days}d - ` : ""}
                        {exam?.fasting_hours ? `fasting ${exam.fasting_hours}h - ` : ""}
                        {item.covered_by_insurance ? "covered by insurance" : brl(item.price_cents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => toggleInsurance(item)}
                        className={`rounded-full border px-3 py-1.5 transition ${
                          item.covered_by_insurance
                            ? "border-moss bg-moss/15 text-moss"
                            : "border-white/70 bg-white/55 text-muted-foreground"
                        }`}
                      >
                        {item.covered_by_insurance ? "Insurance" : "Private"}
                      </button>
                      {["cart", "quote"].includes(selectedOrder.status) && (
                        <button onClick={() => removeItem(item)} className="rounded-full border border-wine/30 bg-wine/5 p-1.5 text-wine">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {prepWarnings.length > 0 && (
              <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-xs leading-5 text-terracotta">
                {prepWarnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/45 p-4">
              <div className="text-sm">
                <p className="text-muted-foreground">Subtotal particular: <span className="font-medium text-foreground">{brl(selectedOrder.subtotal_cents)}</span></p>
                <p className="text-muted-foreground">Desconto: <span className="font-medium text-foreground">{brl(selectedOrder.discount_cents)}</span></p>
                <p className="mt-1 font-display text-xl text-olive">Total: {brl(selectedOrder.total_cents)}</p>
              </div>
              {["cart", "quote"].includes(selectedOrder.status) && (
                <div className="flex items-center gap-2">
                  <input
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="Desconto (R$)"
                    className="w-32 rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <button onClick={applyDiscount} className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportQuote(selectedOrder)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs"
              >
                <FileDown className="h-3.5 w-3.5" /> Quote em PDF
              </button>
              {selectedOrder.status === "cart" && (
                <button onClick={() => setStatus(selectedOrder, "quote")} className="rounded-full bg-olive px-4 py-2 text-xs font-medium text-ivory">
                  Generate quote
                </button>
              )}
              {["cart", "quote"].includes(selectedOrder.status) && (
                <button onClick={() => setStatus(selectedOrder, "ordered")} className="rounded-full bg-moss px-4 py-2 text-xs font-medium text-ivory">
                  Confirm order
                </button>
              )}
              {selectedOrder.status === "ordered" && (
                <button onClick={() => setStatus(selectedOrder, "paid")} className="rounded-full bg-moss px-4 py-2 text-xs font-medium text-ivory">
                  Marcar como pago
                </button>
              )}
              {selectedOrder.status !== "canceled" && selectedOrder.status !== "paid" && (
                <button onClick={() => setStatus(selectedOrder, "canceled")} className="rounded-full border border-wine/30 bg-wine/5 px-4 py-2 text-xs text-wine">
                  Cancel
                </button>
              )}
            </div>
          </Card>
        ) : (
          <EmptyState title="No order selected" hint="Open a cart for a patient and add exams from the catalog." />
        )}
      </div>
    </div>
  );
}
