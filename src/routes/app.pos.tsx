import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileDown,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/pos")({ component: PointOfSale });

type PatientRow = {
  id: string;
  full_name: string;
  social_name: string | null;
  insurance_plan: string | null;
  cpf: string | null;
};

type ExamRow = {
  id: string;
  name: string;
  commercial_name: string | null;
  category: string | null;
  price_cents: number | null;
  preparation: string | null;
  fasting_hours: number | null;
  turnaround_days: number | null;
  requires_screening: boolean | null;
};

type CartItem = {
  exam: ExamRow;
  coveredByInsurance: boolean;
};

type OrderRow = {
  id: string;
  tenant_id: string;
  patient_id: string | null;
  patient_name: string | null;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  created_at: string;
  notes: string | null;
};

type ItemRow = {
  id: string;
  order_id: string;
  exam_id: string | null;
  price_cents: number;
  covered_by_insurance: boolean;
};

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "credit_card", label: "Credit card" },
  { value: "debit_card", label: "Debit card" },
  { value: "cash", label: "Cash" },
  { value: "insurance", label: "Insurance billing" },
];

function money(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: "BRL" });
}

function centsFromInput(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function patientLabel(patient: PatientRow | undefined | null) {
  if (!patient) return "Walk-in patient";
  return patient.social_name || patient.full_name;
}

function examLabel(exam: ExamRow | undefined | null) {
  if (!exam) return "Exam";
  return exam.commercial_name || exam.name;
}

function PointOfSale() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, hasAnyRole, displayName } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const canUse = hasAnyRole(["clinic_admin", "super_admin"]);
  const [patientId, setPatientId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [amountTendered, setAmountTendered] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  if (!canUse) return <Navigate to="/app" />;

  const tenantsList = useQuery({
    queryKey: ["pos-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["pos-patients", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("id,full_name,social_name,insurance_plan,cpf")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as PatientRow[];
    },
  });

  const exams = useQuery({
    queryKey: ["pos-exams", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name,category,price_cents,preparation,fasting_hours,turnaround_days,requires_screening")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ExamRow[];
    },
  });

  const sales = useQuery({
    queryKey: ["pos-sales", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_orders")
        .select("*")
        .eq("origin", "point_of_sale")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const saleItems = useQuery({
    queryKey: ["pos-sale-items", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_order_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(600);
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
  });

  const selectedPatient = useMemo(
    () => (patients.data ?? []).find((patient) => patient.id === patientId) ?? null,
    [patients.data, patientId],
  );

  const categories = useMemo(
    () => Array.from(new Set((exams.data ?? []).map((exam) => exam.category).filter(Boolean) as string[])).sort(),
    [exams.data],
  );

  const filteredExams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (exams.data ?? []).filter((exam) => {
      const matchesCategory = category === "all" || exam.category === category;
      const haystack = [exam.name, exam.commercial_name, exam.category, exam.preparation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, exams.data, query]);

  const discountCents = Math.max(0, centsFromInput(discount));
  const subtotalCents = cart.reduce(
    (sum, item) => sum + (item.coveredByInsurance ? 0 : item.exam.price_cents ?? 0),
    0,
  );
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const tenderedCents = centsFromInput(amountTendered);
  const changeCents = paymentMethod === "cash" ? Math.max(0, tenderedCents - totalCents) : 0;

  const dailyStats = useMemo(() => {
    const today = new Date().toDateString();
    const all = sales.data ?? [];
    const todaySales = all.filter((sale) => new Date(sale.created_at).toDateString() === today);
    return {
      count: todaySales.length,
      revenue: todaySales
        .filter((sale) => sale.payment_status === "paid")
        .reduce((sum, sale) => sum + (sale.total_cents ?? 0), 0),
      pending: todaySales.filter((sale) => sale.payment_status !== "paid").length,
      average: todaySales.length
        ? Math.round(todaySales.reduce((sum, sale) => sum + (sale.total_cents ?? 0), 0) / todaySales.length)
        : 0,
    };
  }, [sales.data]);

  const addExam = (exam: ExamRow) => {
    if (cart.some((item) => item.exam.id === exam.id)) {
      toast.info("This exam is already in the cart.");
      return;
    }
    setCart((current) => [...current, { exam, coveredByInsurance: false }]);
  };

  const itemsOf = (orderId: string) => (saleItems.data ?? []).filter((item) => item.order_id === orderId);
  const examById = (examId: string | null) => (exams.data ?? []).find((exam) => exam.id === examId) ?? null;
  const patientById = (id: string | null) => (patients.data ?? []).find((patient) => patient.id === id) ?? null;

  const receiptLines = (order: OrderRow, items: ItemRow[]) => [
    `Receipt: ${order.id.slice(0, 8).toUpperCase()}`,
    `Patient: ${patientLabel(patientById(order.patient_id))}`,
    `Cashier: ${displayName || user?.email || "Care Kranich"}`,
    `Date: ${new Date(order.created_at).toLocaleString("en-US")}`,
    `Payment: ${PAYMENT_METHODS.find((method) => method.value === order.payment_method)?.label ?? order.payment_method ?? "-"}`,
    "",
    "Exams:",
    ...items.map((item) => {
      const exam = examById(item.exam_id);
      return `- ${examLabel(exam)} ... ${item.covered_by_insurance ? "insurance billing" : money(item.price_cents)}`;
    }),
    "",
    `Subtotal: ${money(order.subtotal_cents)}`,
    `Discount: ${money(order.discount_cents)}`,
    `Total: ${money(order.total_cents)}`,
    order.notes ? `Notes: ${order.notes}` : "",
    "",
    "Care Kranich - in-lab point of sale",
  ].filter(Boolean);

  const exportReceipt = (order: OrderRow) => {
    downloadPdf(
      `receipt-${order.id.slice(0, 8)}.pdf`,
      "Exam sale receipt",
      receiptLines(order, itemsOf(order.id)),
    );
  };

  const checkout = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("No organization available.");
      if (!patientId) throw new Error("Select a patient before checkout.");
      if (cart.length === 0) throw new Error("Add at least one exam to the cart.");
      if (paymentMethod === "cash" && tenderedCents < totalCents) {
        throw new Error("Cash received is lower than the total.");
      }
      const paid = paymentMethod !== "insurance";
      const { data, error } = await (supabase as any)
        .from("exam_orders")
        .insert({
          tenant_id: effTenant,
          patient_id: patientId,
          patient_name: patientLabel(selectedPatient),
          origin: "point_of_sale",
          status: paid ? "paid" : "ordered",
          payment_status: paid ? "paid" : "pending",
          payment_method: paymentMethod,
          subtotal_cents: subtotalCents,
          discount_cents: discountCents,
          total_cents: totalCents,
          notes: saleNotes.trim() || null,
          created_by: user?.id ?? null,
          paid_at: paid ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const orderId = data.id as string;
      const { error: itemError } = await (supabase as any).from("exam_order_items").insert(
        cart.map((item) => ({
          tenant_id: effTenant,
          order_id: orderId,
          exam_id: item.exam.id,
          price_cents: item.exam.price_cents ?? 0,
          covered_by_insurance: item.coveredByInsurance,
          status: "ordered",
        })),
      );
      if (itemError) throw itemError;
      return orderId;
    },
    onSuccess: (orderId) => {
      toast.success(paymentMethod === "insurance" ? "Order sent to insurance billing" : "Sale completed");
      setLastSaleId(orderId);
      setPatientId("");
      setCart([]);
      setDiscount("");
      setAmountTendered("");
      setSaleNotes("");
      qc.invalidateQueries({ queryKey: ["pos-sales", tenantId] });
      qc.invalidateQueries({ queryKey: ["pos-sale-items", tenantId] });
      qc.invalidateQueries({ queryKey: ["exam-orders", tenantId] });
      qc.invalidateQueries({ queryKey: ["exam-order-items", tenantId] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not complete the sale"),
  });

  const lastSale = (sales.data ?? []).find((sale) => sale.id === lastSaleId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="In-lab point of sale"
        subtitle="Sell exams at the front desk, collect payment, create the laboratory order and issue a receipt."
        action={<Pill tone="olive">Clinic owner</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Sales today" value={dailyStats.count} sub="Point-of-sale orders" tone="olive" />
        <Stat label="Paid revenue" value={money(dailyStats.revenue)} sub="Collected today" tone="moss" />
        <Stat label="Pending billing" value={dailyStats.pending} sub="Insurance or unpaid" tone="gold" />
        <Stat label="Average ticket" value={money(dailyStats.average)} sub="Today" tone="wine" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <ShoppingBag className="h-5 w-5 text-olive" /> New counter sale
              </h2>
              <Pill tone={selectedPatient?.insurance_plan ? "gold" : "moss"}>
                {selectedPatient?.insurance_plan || "Private payment"}
              </Pill>
            </div>
            <GlassSelect
              value={patientId}
              onChange={setPatientId}
              placeholder="Select patient"
              options={(patients.data ?? []).map((patient) => ({
                value: patient.id,
                label: `${patientLabel(patient)}${patient.insurance_plan ? ` - ${patient.insurance_plan}` : ""}`,
              }))}
            />
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 shadow-soft backdrop-blur-xl">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search exam by name, category or preparation"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <GlassSelect
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: "All categories" },
                  ...categories.map((item) => ({ value: item, label: item })),
                ]}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredExams.map((exam) => {
                const selected = cart.some((item) => item.exam.id === exam.id);
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => addExam(exam)}
                    className={`group rounded-2xl border p-4 text-left shadow-soft backdrop-blur-xl transition ${
                      selected
                        ? "border-olive/50 bg-olive/10"
                        : "border-white/70 bg-white/55 hover:-translate-y-0.5 hover:bg-white/75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{examLabel(exam)}</p>
                      <Pill tone={selected ? "moss" : "olive"}>{money(exam.price_cents)}</Pill>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {exam.category || "General"}{exam.turnaround_days ? ` - ${exam.turnaround_days}d result` : ""}
                    </p>
                    {(exam.fasting_hours || exam.requires_screening) && (
                      <p className="mt-3 rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs text-foreground/75">
                        {exam.fasting_hours ? `${exam.fasting_hours}h fasting` : "No fasting"}
                        {exam.requires_screening ? " - screening required" : ""}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredExams.length === 0 && (
              <EmptyState title="No exam found" hint="Create or activate exams in the Test catalog before selling." />
            )}
          </Card>
        </div>

        <Card className="sticky top-24 space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ReceiptText className="h-5 w-5 text-olive" /> Cart
            </h2>
            <Pill tone="olive">{cart.length} exam(s)</Pill>
          </div>

          <div className="max-h-[22rem] space-y-2 overflow-y-auto app-scrollbar pr-1">
            {cart.length === 0 && (
              <p className="rounded-2xl border border-white/70 bg-white/45 px-4 py-6 text-center text-sm text-muted-foreground">
                Add exams from the catalog to start the sale.
              </p>
            )}
            {cart.map((item) => (
              <div key={item.exam.id} className="rounded-2xl border border-white/70 bg-white/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{examLabel(item.exam)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.coveredByInsurance ? "Insurance billing" : money(item.exam.price_cents)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCart((current) => current.filter((entry) => entry.exam.id !== item.exam.id))}
                    className="rounded-full border border-wine/25 bg-wine/5 p-1.5 text-wine"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCart((current) =>
                      current.map((entry) =>
                        entry.exam.id === item.exam.id
                          ? { ...entry, coveredByInsurance: !entry.coveredByInsurance }
                          : entry,
                      ),
                    )
                  }
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-xs text-muted-foreground hover:text-olive"
                >
                  {item.coveredByInsurance ? <CheckCircle2 className="h-3.5 w-3.5 text-moss" /> : <Minus className="h-3.5 w-3.5" />}
                  {item.coveredByInsurance ? "Covered by insurance" : "Mark as insurance"}
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/70 bg-white/45 p-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">{money(subtotalCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Discount</span>
              <input
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-28 rounded-xl border border-white/70 bg-white/65 px-3 py-2 text-right text-sm outline-none focus:border-olive/40"
              />
            </div>
            <div className="border-t border-white/70 pt-3">
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-3xl font-semibold text-olive">{money(totalCents)}</span>
              </div>
            </div>
          </div>

          <GlassSelect
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={PAYMENT_METHODS}
            placeholder="Payment method"
          />
          {paymentMethod === "cash" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={amountTendered}
                onChange={(event) => setAmountTendered(event.target.value)}
                inputMode="decimal"
                placeholder="Cash received"
                className="rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
              />
              <div className="rounded-2xl border border-white/70 bg-white/45 px-4 py-2.5 text-sm">
                <span className="block text-[11px] uppercase text-muted-foreground">Change</span>
                <span className="font-semibold text-foreground">{money(changeCents)}</span>
              </div>
            </div>
          )}
          <textarea
            value={saleNotes}
            onChange={(event) => setSaleNotes(event.target.value)}
            rows={3}
            placeholder="Sale notes, internal agreement or payment reference"
            className="w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40"
          />

          <button
            type="button"
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-olive px-5 py-3 text-sm font-semibold text-ivory shadow-soft hover:opacity-90 disabled:opacity-55"
          >
            {paymentMethod === "cash" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            {checkout.isPending ? "Closing sale..." : paymentMethod === "insurance" ? "Create insurance order" : "Close paid sale"}
          </button>
          {lastSale && (
            <button
              type="button"
              onClick={() => exportReceipt(lastSale)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/70 bg-white/60 px-5 py-2 text-xs font-semibold text-olive shadow-soft backdrop-blur-xl hover:bg-white/80"
            >
              <FileDown className="h-4 w-4" /> Download last receipt
            </button>
          )}
        </Card>
      </div>

      <Card className="space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Recent counter sales</h2>
          <Pill tone="moss">Synced with orders and finance</Pill>
        </div>
        {(sales.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No point-of-sale order yet.</p>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {(sales.data ?? []).map((sale) => (
            <div key={sale.id} className="rounded-2xl border border-white/70 bg-white/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {patientLabel(patientById(sale.patient_id))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {itemsOf(sale.id).length} exam(s) - {new Date(sale.created_at).toLocaleString("en-US")}
                  </p>
                </div>
                <Pill tone={sale.payment_status === "paid" ? "moss" : "gold"}>
                  {sale.payment_status === "paid" ? "Paid" : "Pending"}
                </Pill>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-xl font-semibold text-olive">{money(sale.total_cents)}</span>
                <button
                  type="button"
                  onClick={() => exportReceipt(sale)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-xs text-olive"
                >
                  <FileDown className="h-3.5 w-3.5" /> Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
