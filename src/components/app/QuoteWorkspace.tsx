import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { CrudActions } from "@/components/app/CrudActions";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

type QuoteScope = "clinic" | "platform";

type QuoteBlock = {
  id: string;
  kind: string;
  label: string;
  value: string;
  amount_cents: number;
};

type QuoteRow = {
  id: string;
  tenant_id: string | null;
  quote_scope: QuoteScope;
  title: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  status: string;
  valid_until: string | null;
  blocks: QuoteBlock[];
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

type ExamRow = {
  id: string;
  name: string;
  commercial_name: string | null;
  category: string | null;
  price_cents: number | null;
  preparation: string | null;
  turnaround_days: number | null;
};

type Preset = {
  label: string;
  value: string;
  amount_cents: number;
};

type Draft = {
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  valid_until: string;
  status: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  client_address: "",
  valid_until: "",
  status: "draft",
  notes: "",
};

const EMPTY_BLOCK: Omit<QuoteBlock, "id"> = {
  kind: "custom",
  label: "",
  value: "",
  amount_cents: 0,
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const BLOCK_KIND_OPTIONS = [
  { value: "service", label: "Service" },
  { value: "exam", label: "Exam" },
  { value: "contact", label: "Contact field" },
  { value: "address", label: "Address" },
  { value: "value", label: "Value item" },
  { value: "note", label: "Note" },
  { value: "custom", label: "Custom block" },
];

const PLATFORM_PRESETS: Preset[] = [
  { label: "Care Kranich implementation", value: "Discovery, configuration, brand setup and launch support.", amount_cents: 180000 },
  { label: "Clinic SaaS subscription", value: "Monthly access for clinic operations, diagnostics and care modules.", amount_cents: 99000 },
  { label: "Staff onboarding", value: "Training sessions, access rules and operational playbooks.", amount_cents: 45000 },
  { label: "Premium support", value: "Priority support and monthly optimization review.", amount_cents: 65000 },
];

function money(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: "BRL" });
}

function centsFromInput(value: string) {
  const parsed = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function inputFromCents(cents: number) {
  return cents ? (cents / 100).toFixed(2) : "";
}

function newId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function asBlocks(value: unknown): QuoteBlock[] {
  return Array.isArray(value) ? (value as QuoteBlock[]) : [];
}

function totals(blocks: QuoteBlock[]) {
  const subtotal = blocks.reduce((sum, block) => sum + Math.max(0, Number(block.amount_cents) || 0), 0);
  return { subtotal, total: subtotal };
}

function quoteToDraft(quote: QuoteRow): Draft {
  return {
    title: quote.title ?? "",
    client_name: quote.client_name ?? "",
    client_email: quote.client_email ?? "",
    client_phone: quote.client_phone ?? "",
    client_address: quote.client_address ?? "",
    valid_until: quote.valid_until ?? "",
    status: quote.status ?? "draft",
    notes: quote.notes ?? "",
  };
}

export function QuoteWorkspace({
  scope,
  title,
  subtitle,
  superOnly = false,
}: {
  scope: QuoteScope;
  title: string;
  subtitle: string;
  superOnly?: boolean;
}) {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, hasAnyRole } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const canUse = superOnly ? isSuperAdmin : hasAnyRole(["clinic_admin", "super_admin"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [blocks, setBlocks] = useState<QuoteBlock[]>([]);
  const [blockDraft, setBlockDraft] = useState(EMPTY_BLOCK);
  const [amountDraft, setAmountDraft] = useState("");
  const [examId, setExamId] = useState("");

  const quotes = useQuery({
    queryKey: ["service-quotes", scope, tenantId, isSuperAdmin],
    enabled: canUse,
    queryFn: async () => {
      let query = (supabase as any)
        .from("service_quotes")
        .select("*")
        .eq("quote_scope", scope)
        .order("created_at", { ascending: false });
      if (!isSuperAdmin && tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((item: any) => ({ ...item, blocks: asBlocks(item.blocks) })) as QuoteRow[];
    },
  });

  const exams = useQuery({
    queryKey: ["quote-exam-catalog", tenantId],
    enabled: canUse && scope === "clinic",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name,category,price_cents,preparation,turnaround_days")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ExamRow[];
    },
  });

  const selected = (quotes.data ?? []).find((item) => item.id === selectedId) ?? (quotes.data ?? [])[0] ?? null;
  const activeQuotes = (quotes.data ?? []).filter((item) => item.status !== "archived" && !item.archived_at);
  const archivedQuotes = (quotes.data ?? []).filter((item) => item.status === "archived" || item.archived_at);
  const draftTotals = useMemo(() => totals(blocks), [blocks]);

  if (!canUse) return <EmptyState title="Access denied" hint="This workspace is restricted." />;

  const resetForm = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setBlocks([]);
    setBlockDraft(EMPTY_BLOCK);
    setAmountDraft("");
    setExamId("");
  };

  const startEdit = (quote: QuoteRow) => {
    setSelectedId(quote.id);
    setEditingId(quote.id);
    setDraft(quoteToDraft(quote));
    setBlocks(quote.blocks ?? []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addBlock = (block: Omit<QuoteBlock, "id">) => {
    if (!block.label.trim()) {
      toast.error("Name the block before adding it.");
      return;
    }
    setBlocks((current) => [...current, { ...block, id: newId() }]);
    setBlockDraft(EMPTY_BLOCK);
    setAmountDraft("");
  };

  const addCurrentBlock = () => {
    addBlock({
      ...blockDraft,
      amount_cents: centsFromInput(amountDraft),
    });
  };

  const addExamBlock = () => {
    const exam = (exams.data ?? []).find((item) => item.id === examId);
    if (!exam) return toast.error("Select an exam from the catalog.");
    addBlock({
      kind: "exam",
      label: exam.commercial_name || exam.name,
      value: [
        exam.category,
        exam.turnaround_days ? `${exam.turnaround_days} day turnaround` : "",
        exam.preparation,
      ].filter(Boolean).join(" - "),
      amount_cents: exam.price_cents ?? 0,
    });
    setExamId("");
  };

  const addPreset = (preset: Preset) => {
    addBlock({ kind: "service", label: preset.label, value: preset.value, amount_cents: preset.amount_cents });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveQuote = useMutation({
    mutationFn: async () => {
      if (scope === "clinic" && !tenantId && !isSuperAdmin) throw new Error("No organization available.");
      if (draft.title.trim().length < 3) throw new Error("Add a quote title.");
      if (draft.client_name.trim().length < 2) throw new Error("Add the client name.");
      const calculated = totals(blocks);
      const payload = {
        tenant_id: scope === "clinic" ? tenantId : null,
        quote_scope: scope,
        title: draft.title.trim(),
        client_name: draft.client_name.trim(),
        client_email: draft.client_email.trim() || null,
        client_phone: draft.client_phone.trim() || null,
        client_address: draft.client_address.trim() || null,
        status: draft.status,
        valid_until: draft.valid_until || null,
        blocks,
        subtotal_cents: calculated.subtotal,
        discount_cents: 0,
        total_cents: calculated.total,
        notes: draft.notes.trim() || null,
        created_by: user?.id ?? null,
        archived_at: draft.status === "archived" ? new Date().toISOString() : null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("service_quotes").update(payload).eq("id", editingId);
        if (error) throw error;
        return editingId;
      }
      const { data, error } = await (supabase as any).from("service_quotes").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success(editingId ? "Quote updated" : "Quote created");
      setSelectedId(id);
      resetForm();
      qc.invalidateQueries({ queryKey: ["service-quotes", scope] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not save the quote"),
  });

  const patchQuote = async (quote: QuoteRow, changes: Partial<QuoteRow>, success: string) => {
    const { error } = await (supabase as any).from("service_quotes").update(changes).eq("id", quote.id);
    if (error) return toast.error(error.message);
    toast.success(success);
    qc.invalidateQueries({ queryKey: ["service-quotes", scope] });
  };

  const deleteQuote = async (quote: QuoteRow) => {
    if (!window.confirm(`Delete quote "${quote.title}"?`)) return;
    const { error } = await (supabase as any).from("service_quotes").delete().eq("id", quote.id);
    if (error) return toast.error(error.message);
    toast.success("Quote deleted");
    if (selectedId === quote.id) setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["service-quotes", scope] });
  };

  const shareQuote = async (quote: QuoteRow) => {
    const text = `${quote.title}\nClient: ${quote.client_name}\nTotal: ${money(quote.total_cents)}\nStatus: ${quote.status}`;
    await navigator.clipboard.writeText(text);
    toast.success("Quote summary copied");
  };

  const exportQuote = (quote: QuoteRow) => {
    const lines = [
      `Client: ${quote.client_name}`,
      quote.client_email ? `Email: ${quote.client_email}` : "",
      quote.client_phone ? `Phone: ${quote.client_phone}` : "",
      quote.client_address ? `Address: ${quote.client_address}` : "",
      quote.valid_until ? `Valid until: ${new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString("en-US")}` : "",
      `Status: ${quote.status}`,
      "",
      "Proposal blocks:",
      ...(quote.blocks ?? []).flatMap((block, index) => [
        `${index + 1}. ${block.label}${block.amount_cents ? ` - ${money(block.amount_cents)}` : ""}`,
        block.value ? `   ${block.value}` : "",
      ]),
      "",
      `Subtotal: ${money(quote.subtotal_cents)}`,
      `Total: ${money(quote.total_cents)}`,
      quote.notes ? `Notes: ${quote.notes}` : "",
      "",
      scope === "clinic" ? "Prepared by the diagnostics clinic." : "Prepared by Care Kranich platform administration.",
    ].filter(Boolean);
    downloadPdf(`${scope}-quote-${quote.client_name}.pdf`, quote.title, lines);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} action={<Pill tone="olive">{scope === "clinic" ? "Clinic quotes" : "Super admin only"}</Pill>} />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Active quotes" value={activeQuotes.length} sub="Draft, sent or approved" tone="olive" />
        <Stat label="Archived" value={archivedQuotes.length} sub="Hidden from active work" tone="muted" />
        <Stat label="Pipeline value" value={money(activeQuotes.reduce((sum, item) => sum + item.total_cents, 0))} sub="Active total" tone="moss" />
        <Stat label="Approved" value={(quotes.data ?? []).filter((item) => item.status === "approved").length} sub="Accepted proposals" tone="gold" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <Card className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{editingId ? "Edit quote" : "Create quote"}</h2>
              <p className="text-sm text-muted-foreground">Compose the PDF by adding and moving content blocks.</p>
            </div>
            {editingId && (
              <button onClick={resetForm} className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs text-foreground">
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Quote title" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40 md:col-span-2" />
            <input value={draft.client_name} onChange={(event) => setDraft({ ...draft, client_name: event.target.value })} placeholder="Client or company name" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40" />
            <GlassSelect value={draft.status} onChange={(value) => setDraft({ ...draft, status: value })} options={STATUS_OPTIONS} />
            <input value={draft.client_email} onChange={(event) => setDraft({ ...draft, client_email: event.target.value })} placeholder="Email" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40" />
            <input value={draft.client_phone} onChange={(event) => setDraft({ ...draft, client_phone: event.target.value })} placeholder="Phone" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40" />
            <input value={draft.client_address} onChange={(event) => setDraft({ ...draft, client_address: event.target.value })} placeholder="Address" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40" />
            <input type="date" value={draft.valid_until} onChange={(event) => setDraft({ ...draft, valid_until: event.target.value })} className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40" />
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Internal or customer-facing notes" rows={3} className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40 md:col-span-2" />
          </div>

          {scope === "clinic" && (
            <div className="rounded-3xl border border-white/70 bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Add exam from catalog</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <GlassSelect
                  value={examId}
                  onChange={setExamId}
                  placeholder="Select exam"
                  className="min-w-72 flex-1"
                  options={(exams.data ?? []).map((exam) => ({
                    value: exam.id,
                    label: `${exam.commercial_name || exam.name} - ${money(exam.price_cents)}`,
                  }))}
                />
                <button onClick={addExamBlock} className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-semibold text-ivory">
                  <Plus className="h-4 w-4" /> Add exam
                </button>
              </div>
            </div>
          )}

          {scope === "platform" && (
            <div className="rounded-3xl border border-white/70 bg-white/45 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Quick service blocks</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PLATFORM_PRESETS.map((preset) => (
                  <button key={preset.label} onClick={() => addPreset(preset)} className="rounded-full border border-white/70 bg-white/60 px-3 py-2 text-xs text-foreground hover:bg-white">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-white/70 bg-white/45 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Add custom block</p>
            <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_160px]">
              <GlassSelect value={blockDraft.kind} onChange={(kind) => setBlockDraft({ ...blockDraft, kind })} options={BLOCK_KIND_OPTIONS} />
              <input value={blockDraft.label} onChange={(event) => setBlockDraft({ ...blockDraft, label: event.target.value })} placeholder="Block label, e.g. Billing contact" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm outline-none" />
              <input value={amountDraft} onChange={(event) => setAmountDraft(event.target.value)} placeholder="Value, e.g. 490.00" className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm outline-none" />
              <textarea value={blockDraft.value} onChange={(event) => setBlockDraft({ ...blockDraft, value: event.target.value })} placeholder="Block content: address, phone, email, scope, payment rule or note" rows={2} className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm outline-none md:col-span-2" />
              <button onClick={addCurrentBlock} className="inline-flex items-center justify-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-semibold text-ivory">
                <Plus className="h-4 w-4" /> Add block
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">PDF block order</p>
              <Pill tone="moss">{money(draftTotals.total)}</Pill>
            </div>
            {blocks.length === 0 && <p className="rounded-2xl border border-white/70 bg-white/45 p-4 text-sm text-muted-foreground">No blocks yet. Add exams, services or custom fields to build the quote PDF.</p>}
            {blocks.map((block, index) => (
              <div key={block.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/55 p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{block.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{block.value || BLOCK_KIND_OPTIONS.find((item) => item.value === block.kind)?.label}</p>
                </div>
                {block.amount_cents > 0 && <Pill tone="olive">{money(block.amount_cents)}</Pill>}
                <button onClick={() => moveBlock(index, -1)} className="rounded-full border border-white/70 bg-white/60 px-2 py-1 text-xs">Up</button>
                <button onClick={() => moveBlock(index, 1)} className="rounded-full border border-white/70 bg-white/60 px-2 py-1 text-xs">Down</button>
                <button onClick={() => setBlocks((items) => items.filter((item) => item.id !== block.id))} className="rounded-full border border-wine/30 bg-wine/5 p-1.5 text-wine">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button disabled={saveQuote.isPending} onClick={() => saveQuote.mutate()} className="w-full rounded-full bg-olive px-5 py-3 text-sm font-semibold text-ivory shadow-soft disabled:opacity-55">
            {saveQuote.isPending ? "Saving..." : editingId ? "Save quote changes" : "Create quote"}
          </button>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Quotes</h2>
            <Pill tone="olive">{quotes.data?.length ?? 0} records</Pill>
          </div>
          <div className="max-h-[44rem] space-y-3 overflow-y-auto app-scrollbar pr-1">
            {(quotes.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No quotes yet.</p>}
            {(quotes.data ?? []).map((quote) => (
              <button
                key={quote.id}
                onClick={() => setSelectedId(quote.id)}
                className={`block w-full rounded-2xl border p-4 text-left transition ${
                  selected?.id === quote.id ? "border-olive/50 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{quote.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{quote.client_name}</p>
                  </div>
                  <Pill tone={quote.status === "approved" ? "moss" : quote.status === "archived" ? "muted" : "olive"}>{quote.status}</Pill>
                </div>
                <p className="mt-2 font-display text-xl font-semibold text-olive">{money(quote.total_cents)}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {selected && (
        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{selected.title}</h2>
              <p className="text-sm text-muted-foreground">{selected.client_name} - {money(selected.total_cents)}</p>
            </div>
            <Pill tone={selected.status === "approved" ? "moss" : selected.status === "archived" ? "muted" : "olive"}>{selected.status}</Pill>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Email" value={selected.client_email} />
            <Info label="Phone" value={selected.client_phone} />
            <Info label="Address" value={selected.client_address} />
            <Info label="Valid until" value={selected.valid_until ? new Date(`${selected.valid_until}T12:00:00`).toLocaleDateString("en-US") : "-"} />
          </div>
          <div className="space-y-2">
            {(selected.blocks ?? []).map((block, index) => (
              <div key={block.id} className="rounded-2xl border border-white/70 bg-white/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{index + 1}. {block.label}</p>
                  {block.amount_cents > 0 && <Pill tone="olive">{money(block.amount_cents)}</Pill>}
                </div>
                {block.value && <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.value}</p>}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/45 p-4">
            <p className="font-display text-2xl font-semibold text-olive">Total {money(selected.total_cents)}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => exportQuote(selected)} className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs text-olive">
                <FileDown className="h-3.5 w-3.5" /> Branded PDF
              </button>
              <button onClick={() => navigator.clipboard.writeText(JSON.stringify(selected.blocks, null, 2)).then(() => toast.success("Blocks copied"))} className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs text-foreground">
                <Copy className="h-3.5 w-3.5" /> Copy blocks
              </button>
            </div>
          </div>
          <CrudActions
            onEdit={() => startEdit(selected)}
            onArchive={() =>
              patchQuote(
                selected,
                selected.status === "archived"
                  ? { status: "draft", archived_at: null as any }
                  : { status: "archived", archived_at: new Date().toISOString() as any },
                selected.status === "archived" ? "Quote restored" : "Quote archived",
              )
            }
            archiveLabel={selected.status === "archived" ? "Restore" : "Archive"}
            onShare={() => shareQuote(selected)}
            onDelete={() => deleteQuote(selected)}
          />
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground">{value || "-"}</p>
    </div>
  );
}
