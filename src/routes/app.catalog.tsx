import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dna, FileDown, FlaskConical, Package, Pencil, Plus, ScanLine, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/catalog")({ component: Catalog });

type ExamRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  preparation: string | null;
  price_cents: number | null;
  payment_link: string | null;
  active: boolean;
  category: string;
  subcategory: string | null;
  slug: string | null;
  commercial_name: string | null;
  technical_name: string | null;
  benefits: string | null;
  indication: string | null;
  contraindication: string | null;
  biological_material: string | null;
  collection_method: string | null;
  technology: string | null;
  genes_analyzed: string | null;
  fasting_hours: number | null;
  turnaround_days: number | null;
  allow_installments: boolean | null;
  insurance_accepted: string | null;
  home_collection: boolean | null;
  requires_screening: boolean | null;
  requires_counseling: boolean | null;
  consent_required: boolean | null;
  sample_storage_policy: string | null;
  min_age: number | null;
  max_age: number | null;
  faq: Array<{ q: string; a: string }> | null;
  risks: string | null;
  limitations: string | null;
  is_public: boolean | null;
};

type PanelRow = {
  id: string;
  name: string;
  description: string | null;
  audience: string | null;
  price_cents: number | null;
  exam_ids: string[];
  active: boolean;
};

const CATEGORIES = [
  { value: "laboratorial", label: "Laboratorial" },
  { value: "imagem", label: "Diagnostic imaging" },
  { value: "genetica", label: "Genetics" },
];

const EMPTY_FORM = {
  name: "",
  commercial_name: "",
  technical_name: "",
  category: "laboratorial",
  subcategory: "",
  description: "",
  benefits: "",
  indication: "",
  contraindication: "",
  biological_material: "",
  collection_method: "",
  technology: "",
  genes_analyzed: "",
  preparation: "",
  fasting_hours: "",
  turnaround_days: "",
  price: "",
  insurance_accepted: "",
  sample_storage_policy: "",
  min_age: "",
  max_age: "",
  risks: "",
  limitations: "",
  payment_link: "",
  allow_installments: true,
  home_collection: false,
  requires_screening: false,
  requires_counseling: false,
  consent_required: false,
  is_public: true,
};

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function brl(cents: number | null) {
  if (cents === null || cents === undefined) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORY_ICON: Record<string, typeof FlaskConical> = {
  laboratorial: FlaskConical,
  imagem: ScanLine,
  genetica: Dna,
};

function Catalog() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [faq, setFaq] = useState<Array<{ q: string; a: string }>>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelDraft, setPanelDraft] = useState({ name: "", description: "", audience: "", price: "" });
  const [panelExams, setPanelExams] = useState<string[]>([]);

  const exams = useQuery({
    queryKey: ["catalog-v2", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ExamRow[];
    },
  });

  const panels = useQuery({
    queryKey: ["catalog-panels", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_panels")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PanelRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exams.data ?? []).filter((e) => {
      const matchesTab = tab === "all" || e.category === tab;
      if (!matchesTab) return false;
      if (!q) return true;
      return [e.name, e.commercial_name, e.technical_name, e.subcategory, e.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [exams.data, tab, query]);

  const save = useMutation({
    mutationFn: async () => {
      if (form.name.trim().length < 2) throw new Error("Enter the exam name.");
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        commercial_name: form.commercial_name.trim() || null,
        technical_name: form.technical_name.trim() || null,
        category: form.category,
        subcategory: form.subcategory.trim() || null,
        slug: slugify(form.commercial_name.trim() || form.name.trim()),
        description: form.description.trim() || null,
        benefits: form.benefits.trim() || null,
        indication: form.indication.trim() || null,
        contraindication: form.contraindication.trim() || null,
        biological_material: form.biological_material.trim() || null,
        collection_method: form.collection_method.trim() || null,
        technology: form.technology.trim() || null,
        genes_analyzed: form.genes_analyzed.trim() || null,
        preparation: form.preparation.trim() || null,
        fasting_hours: form.fasting_hours ? Number(form.fasting_hours) : null,
        turnaround_days: form.turnaround_days ? Number(form.turnaround_days) : null,
        price_cents: form.price ? Math.round(Number(form.price.replace(",", ".")) * 100) : null,
        insurance_accepted: form.insurance_accepted.trim() || null,
        sample_storage_policy: form.sample_storage_policy.trim() || null,
        min_age: form.min_age ? Number(form.min_age) : null,
        max_age: form.max_age ? Number(form.max_age) : null,
        risks: form.risks.trim() || null,
        limitations: form.limitations.trim() || null,
        payment_link: form.payment_link.trim() || null,
        allow_installments: form.allow_installments,
        home_collection: form.home_collection,
        requires_screening: form.requires_screening,
        requires_counseling: form.requires_counseling,
        consent_required: form.consent_required,
        is_public: form.is_public,
        faq: faq.filter((f) => f.q.trim()),
      };
      if (editingId) {
        const { error } = await (supabase as any).from("exam_catalog").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.tenant_id = tenantId;
        payload.created_by = user?.id ?? null;
        const { error } = await (supabase as any).from("exam_catalog").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Exam updated" : "Exam created in catalog");
      setForm({ ...EMPTY_FORM });
      setFaq([]);
      setOpen(false);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["catalog-v2"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save the exam"),
  });

  const toggleActive = useMutation({
    mutationFn: async (exam: ExamRow) => {
      const { error } = await (supabase as any)
        .from("exam_catalog")
        .update({ active: !exam.active })
        .eq("id", exam.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-v2"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const savePanel = useMutation({
    mutationFn: async () => {
      if (panelDraft.name.trim().length < 2) throw new Error("Enter the package name.");
      if (panelExams.length < 2) throw new Error("Select at least 2 exams for the package.");
      const { error } = await (supabase as any).from("exam_panels").insert({
        tenant_id: tenantId,
        name: panelDraft.name.trim(),
        description: panelDraft.description.trim() || null,
        audience: panelDraft.audience.trim() || null,
        price_cents: panelDraft.price ? Math.round(Number(panelDraft.price.replace(",", ".")) * 100) : null,
        exam_ids: panelExams,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pacote criado");
      setPanelDraft({ name: "", description: "", audience: "", price: "" });
      setPanelExams([]);
      setPanelOpen(false);
      qc.invalidateQueries({ queryKey: ["catalog-panels"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not create the package"),
  });

  const togglePanel = useMutation({
    mutationFn: async (panel: PanelRow) => {
      const { error } = await (supabase as any)
        .from("exam_panels")
        .update({ active: !panel.active })
        .eq("id", panel.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-panels"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (e: ExamRow) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      commercial_name: e.commercial_name ?? "",
      technical_name: e.technical_name ?? "",
      category: e.category ?? "laboratorial",
      subcategory: e.subcategory ?? "",
      description: e.description ?? "",
      benefits: e.benefits ?? "",
      indication: e.indication ?? "",
      contraindication: e.contraindication ?? "",
      biological_material: e.biological_material ?? "",
      collection_method: e.collection_method ?? "",
      technology: e.technology ?? "",
      genes_analyzed: e.genes_analyzed ?? "",
      preparation: e.preparation ?? "",
      fasting_hours: e.fasting_hours?.toString() ?? "",
      turnaround_days: e.turnaround_days?.toString() ?? "",
      price: e.price_cents !== null ? (e.price_cents / 100).toFixed(2).replace(".", ",") : "",
      insurance_accepted: e.insurance_accepted ?? "",
      sample_storage_policy: e.sample_storage_policy ?? "",
      min_age: e.min_age?.toString() ?? "",
      max_age: e.max_age?.toString() ?? "",
      risks: e.risks ?? "",
      limitations: e.limitations ?? "",
      payment_link: e.payment_link ?? "",
      allow_installments: e.allow_installments ?? true,
      home_collection: e.home_collection ?? false,
      requires_screening: e.requires_screening ?? false,
      requires_counseling: e.requires_counseling ?? false,
      consent_required: e.consent_required ?? false,
      is_public: e.is_public ?? true,
    });
    setFaq(Array.isArray(e.faq) ? e.faq : []);
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportPdf = (e: ExamRow) => {
    downloadPdf(`exam-${e.name}.pdf`, e.commercial_name || e.name, [
      `Categoria: ${CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}${e.subcategory ? ` / ${e.subcategory}` : ""}`,
      `Technical name: ${e.technical_name ?? "-"}`,
      `Description: ${e.description ?? "-"}`,
      `Indication: ${e.indication ?? "-"}`,
      `Material: ${e.biological_material ?? "-"}  Coleta: ${e.collection_method ?? "-"}`,
      `Tecnologia: ${e.technology ?? "-"}`,
      e.category === "genetica" ? `Genes analisados: ${e.genes_analyzed ?? "-"}` : "",
      `Preparation: ${e.preparation ?? "None"}  Jejum: ${e.fasting_hours ? `${e.fasting_hours}h` : "Not required"}`,
      `Prazo do resultado: ${e.turnaround_days ? `${e.turnaround_days} days` : "-"}`,
      `Price: ${brl(e.price_cents)}  Installments: ${e.allow_installments ? "yes" : "no"}`,
      `Insurance plans: ${e.insurance_accepted ?? "-"}`,
      `Home collection: ${e.home_collection ? "yes" : "no"}  Pre-screening: ${e.requires_screening ? "yes" : "no"}`,
      `Counseling: ${e.requires_counseling ? "yes" : "no"}  Consent: ${e.consent_required ? "required" : "not required"}`,
      `Riscos: ${e.risks ?? "-"}`,
      `Limitations: ${e.limitations ?? "-"}`,
    ].filter(Boolean));
  };

  const toggles: Array<{ key: keyof typeof EMPTY_FORM; label: string }> = [
    { key: "allow_installments", label: "Permite parcelamento" },
    { key: "home_collection", label: "Coleta domiciliar" },
    { key: "requires_screening", label: "Requires pre-screening" },
    { key: "requires_counseling", label: "Recomenda aconselhamento" },
    { key: "consent_required", label: "Consent required" },
    { key: "is_public", label: "Visible on public site" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam catalog"
        subtitle="Laboratory, imaging and genetic exams with full records, preparation, prices and packages."
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-sm backdrop-blur-xl hover:bg-white/80"
            >
              <Package className="h-4 w-4" /> Novo pacote
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY_FORM });
                setFaq([]);
                setOpen(!open);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New exam
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            onClick={() => setTab(c.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              tab === c.value
                ? "bg-olive text-ivory shadow-soft"
                : "border border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={`${glassInput} pl-11`} placeholder="Buscar exam..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {panelOpen && (
        <Card className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-foreground">Novo pacote de exams</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <input className={glassInput} placeholder="Nome do pacote *" value={panelDraft.name} onChange={(e) => setPanelDraft({ ...panelDraft, name: e.target.value })} />
            <input className={glassInput} placeholder="Audience (e.g. 60+ checkup)" value={panelDraft.audience} onChange={(e) => setPanelDraft({ ...panelDraft, audience: e.target.value })} />
            <input className={glassInput} placeholder="Package price (BRL)" value={panelDraft.price} onChange={(e) => setPanelDraft({ ...panelDraft, price: e.target.value })} />
            <input className={glassInput} placeholder="Descrição" value={panelDraft.description} onChange={(e) => setPanelDraft({ ...panelDraft, description: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(exams.data ?? []).filter((e) => e.active).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() =>
                  setPanelExams((prev) => (prev.includes(e.id) ? prev.filter((id) => id !== e.id) : [...prev, e.id]))
                }
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  panelExams.includes(e.id)
                    ? "border-olive bg-olive text-ivory shadow-soft"
                    : "border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
                }`}
              >
                {e.commercial_name || e.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => savePanel.mutate()}
            disabled={savePanel.isPending}
            className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
          >
            {savePanel.isPending ? "Saving..." : `Create package (${panelExams.length} exams)`}
          </button>
        </Card>
      )}

      {open && (
        <Card className="space-y-5 p-6">
          <h3 className="text-sm font-semibold text-foreground">{editingId ? "Edit exam" : "New exam"}</h3>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identification</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input className={glassInput} placeholder="Nome do exam *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className={glassInput} placeholder="Nome comercial" value={form.commercial_name} onChange={(e) => setForm({ ...form, commercial_name: e.target.value })} />
              <input className={glassInput} placeholder="Technical name" value={form.technical_name} onChange={(e) => setForm({ ...form, technical_name: e.target.value })} />
              <GlassSelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
              <input className={glassInput} placeholder="Subcategory (e.g. hormones, ultrasound, oncogenetics)" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clinical description</p>
            <div className="grid gap-3 md:grid-cols-2">
              <textarea className={`${glassInput} min-h-[70px]`} placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <textarea className={`${glassInput} min-h-[70px]`} placeholder="Benefits" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
              <textarea className={`${glassInput} min-h-[70px]`} placeholder="Indication (who it is recommended for)" value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })} />
              <textarea className={`${glassInput} min-h-[70px]`} placeholder="Contraindication (who it is not indicated for)" value={form.contraindication} onChange={(e) => setForm({ ...form, contraindication: e.target.value })} />
              <textarea className={`${glassInput} min-h-[70px]`} placeholder="Riscos" value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} />
              <textarea className={`${glassInput} min-h-[70px]`} placeholder="Limitações" value={form.limitations} onChange={(e) => setForm({ ...form, limitations: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operacional</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input className={glassInput} placeholder="Biological material (e.g. blood, saliva)" value={form.biological_material} onChange={(e) => setForm({ ...form, biological_material: e.target.value })} />
              <input className={glassInput} placeholder="Collection method" value={form.collection_method} onChange={(e) => setForm({ ...form, collection_method: e.target.value })} />
              <input className={glassInput} placeholder="Technology (e.g. PCR, NGS, chemiluminescence)" value={form.technology} onChange={(e) => setForm({ ...form, technology: e.target.value })} />
              <input className={glassInput} placeholder="Required preparation" value={form.preparation} onChange={(e) => setForm({ ...form, preparation: e.target.value })} />
              <input className={glassInput} placeholder="Jejum (hours)" inputMode="numeric" value={form.fasting_hours} onChange={(e) => setForm({ ...form, fasting_hours: e.target.value })} />
              <input className={glassInput} placeholder="Prazo do resultado (days)" inputMode="numeric" value={form.turnaround_days} onChange={(e) => setForm({ ...form, turnaround_days: e.target.value })} />
              <input className={glassInput} placeholder="Minimum age" inputMode="numeric" value={form.min_age} onChange={(e) => setForm({ ...form, min_age: e.target.value })} />
              <input className={glassInput} placeholder="Maximum age" inputMode="numeric" value={form.max_age} onChange={(e) => setForm({ ...form, max_age: e.target.value })} />
            </div>
          </div>

          {form.category === "genetica" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Genetics</p>
              <div className="grid gap-3 md:grid-cols-2">
                <textarea className={`${glassInput} min-h-[70px]`} placeholder="Genes analisados (ex.: BRCA1, BRCA2, TP53...)" value={form.genes_analyzed} onChange={(e) => setForm({ ...form, genes_analyzed: e.target.value })} />
                <textarea className={`${glassInput} min-h-[70px]`} placeholder="Sample storage and disposal policy" value={form.sample_storage_policy} onChange={(e) => setForm({ ...form, sample_storage_policy: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Genetic results have restricted access, require explicit consent, and predisposition does not mean diagnosis.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comercial</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input className={glassInput} placeholder="Price (BRL)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <input className={glassInput} placeholder="Accepted insurance plans" value={form.insurance_accepted} onChange={(e) => setForm({ ...form, insurance_accepted: e.target.value })} />
              <input className={glassInput} placeholder="Link de pagamento" value={form.payment_link} onChange={(e) => setForm({ ...form, payment_link: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              {toggles.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm({ ...form, [t.key]: !form[t.key] })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    form[t.key]
                      ? "border-olive bg-olive text-ivory shadow-soft"
                      : "border-white/70 bg-white/55 text-muted-foreground backdrop-blur-xl"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perguntas frequentes</p>
            {faq.map((item, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-2">
                <input className={glassInput} placeholder="Pergunta" value={item.q} onChange={(e) => setFaq(faq.map((f, j) => (j === i ? { ...f, q: e.target.value } : f)))} />
                <div className="flex gap-2">
                  <input className={glassInput} placeholder="Resposta" value={item.a} onChange={(e) => setFaq(faq.map((f, j) => (j === i ? { ...f, a: e.target.value } : f)))} />
                  <button onClick={() => setFaq(faq.filter((_, j) => j !== i))} className="rounded-full border border-white/70 bg-white/55 px-3 text-xs text-wine backdrop-blur-xl">
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setFaq([...faq, { q: "", a: "" }])} className="rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-xs backdrop-blur-xl hover:bg-white/80">
              + Adicionar pergunta
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
            >
              {save.isPending ? "Saving..." : editingId ? "Salvar alterações" : "Create exam"}
            </button>
            <button onClick={() => { setOpen(false); setEditingId(null); }} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {(panels.data ?? []).length > 0 && (
        <Card className="space-y-3 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Package className="h-4 w-4" /> Pacotes
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {(panels.data ?? []).map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-2 rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.exam_ids.length} exams · {brl(p.price_cents)}{p.audience ? ` · ${p.audience}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={p.active ? "moss" : "muted"}>{p.active ? "Active" : "Inactive"}</Pill>
                  <button onClick={() => togglePanel.mutate(p)} className="text-xs text-muted-foreground hover:underline">
                    {p.active ? "Desativar" : "Reativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No exam in this category" hint="Create laboratory, imaging and genetic exams with full records." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => {
            const Icon = CATEGORY_ICON[e.category] ?? FlaskConical;
            return (
              <Card key={e.id} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/15 text-olive">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{e.commercial_name || e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORIES.find((c) => c.value === e.category)?.label}
                        {e.subcategory ? ` · ${e.subcategory}` : ""}
                      </p>
                    </div>
                  </div>
                  <Pill tone={e.active ? "moss" : "muted"}>{e.active ? "Active" : "Inactive"}</Pill>
                </div>
                <p className="text-sm font-medium text-olive">{brl(e.price_cents)}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {e.turnaround_days ? <Pill tone="muted">Resultado em {e.turnaround_days}d</Pill> : null}
                  {e.fasting_hours ? <Pill tone="muted">Jejum {e.fasting_hours}h</Pill> : null}
                  {e.home_collection ? <Pill tone="olive">Domiciliar</Pill> : null}
                  {e.requires_screening ? <Pill tone="terracotta">Triagem</Pill> : null}
                  {e.category === "genetica" && e.consent_required ? <Pill tone="wine">Consent</Pill> : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button onClick={() => startEdit(e)} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => toggleActive.mutate(e)} className="rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                    {e.active ? "Desativar" : "Reativar"}
                  </button>
                  <button onClick={() => exportPdf(e)} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                    <FileDown className="h-3.5 w-3.5" /> Ficha PDF
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
