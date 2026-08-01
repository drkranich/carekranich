import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FileDown, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/units")({ component: Units });

type UnitRow = {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  accessibility: boolean;
  parking: boolean;
  child_collection: boolean;
  home_collection: boolean;
  imaging: boolean;
  notes: string | null;
  status: string;
  created_at: string;
};

type UnitForm = {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  email: string;
  accessibility: boolean;
  parking: boolean;
  child_collection: boolean;
  home_collection: boolean;
  imaging: boolean;
  notes: string;
};

const EMPTY: UnitForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  phone: "",
  email: "",
  accessibility: false,
  parking: false,
  child_collection: false,
  home_collection: false,
  imaging: false,
  notes: "",
};

const FLAGS: Array<{ key: keyof UnitForm; label: string }> = [
  { key: "accessibility", label: "Acessibilidade" },
  { key: "parking", label: "Estacionamento" },
  { key: "child_collection", label: "Coleta infantil" },
  { key: "home_collection", label: "Coleta domiciliar" },
  { key: "imaging", label: "Diagnostic imaging" },
];

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function Units() {
  const qc = useQueryClient();
  const { profile, isSuperAdmin, isAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [form, setForm] = useState<UnitForm>(EMPTY);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const units = useQuery({
    queryKey: ["clinic-units", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinic_units")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UnitRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (form.name.trim().length < 2) throw new Error("Enter the unit name.");
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postal_code: form.postal_code.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        accessibility: form.accessibility,
        parking: form.parking,
        child_collection: form.child_collection,
        home_collection: form.home_collection,
        imaging: form.imaging,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("clinic_units").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.tenant_id = tenantId;
        const { error } = await (supabase as any).from("clinic_units").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Unidade atualizada" : "Unidade criada");
      setForm(EMPTY);
      setOpen(false);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["clinic-units"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save the unit"),
  });

  const toggleStatus = useMutation({
    mutationFn: async (unit: UnitRow) => {
      const { error } = await (supabase as any)
        .from("clinic_units")
        .update({ status: unit.status === "active" ? "inactive" : "active" })
        .eq("id", unit.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinic-units"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (unit: UnitRow) => {
    setEditingId(unit.id);
    setForm({
      name: unit.name,
      address: unit.address ?? "",
      city: unit.city ?? "",
      state: unit.state ?? "",
      postal_code: unit.postal_code ?? "",
      phone: unit.phone ?? "",
      email: unit.email ?? "",
      accessibility: unit.accessibility,
      parking: unit.parking,
      child_collection: unit.child_collection,
      home_collection: unit.home_collection,
      imaging: unit.imaging,
      notes: unit.notes ?? "",
    });
    setOpen(true);
  };

  const exportPdf = (unit: UnitRow) => {
    downloadPdf(`unidade-${unit.name}.pdf`, `Unidade ${unit.name}`, [
      `Address: ${unit.address ?? "-"}, ${unit.city ?? "-"} / ${unit.state ?? "-"}`,
      `CEP: ${unit.postal_code ?? "-"}`,
      `Telefone: ${unit.phone ?? "-"}  E-mail: ${unit.email ?? "-"}`,
      `Accessibility: ${unit.accessibility ? "yes" : "no"}  Parking: ${unit.parking ? "yes" : "no"}`,
      `Child collection: ${unit.child_collection ? "yes" : "no"}  Home collection: ${unit.home_collection ? "yes" : "no"}`,
      `Diagnostic imaging: ${unit.imaging ? "yes" : "no"}`,
      `Status: ${unit.status === "active" ? "Ativa" : "Inativa"}`,
      `Notes: ${unit.notes ?? "-"}`,
    ]);
  };

  if (!isAdmin && !isSuperAdmin) {
    return (
      <EmptyState
        title="Acesso restrito"
        hint="Somente administradores podem gerenciar unidades."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit management"
        subtitle="Physical organization units: addresses, capacities and available services."
        action={
          <button
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY);
              setOpen(!open);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New unit
          </button>
        }
      />

      {open && (
        <Card className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-foreground">
            {editingId ? "Edit unidade" : "New unit"}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className={glassInput} placeholder="Nome da unidade *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={glassInput} placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={glassInput} placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={`${glassInput} md:col-span-2`} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className={glassInput} placeholder="CEP" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
            <input className={glassInput} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className={glassInput} placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <input className={glassInput} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            {FLAGS.map((flag) => (
              <button
                key={flag.key}
                type="button"
                onClick={() => setForm({ ...form, [flag.key]: !form[flag.key] } as UnitForm)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  form[flag.key]
                    ? "border-olive bg-olive text-ivory shadow-soft"
                    : "border-white/70 bg-white/55 text-foreground/80 backdrop-blur-xl"
                }`}
              >
                {flag.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
            >
              {save.isPending ? "Saving..." : editingId ? "Salvar alterações" : "Create unit"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
              className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {(units.data ?? []).length === 0 ? (
        <EmptyState
          title="No unit registered"
          hint="Register the first unit to enable scheduling by unit, reception and home collection."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(units.data ?? []).map((unit) => (
            <Card key={unit.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/15 text-olive">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[unit.address, unit.city, unit.state].filter(Boolean).join(", ") || "Address not provided"}
                    </p>
                  </div>
                </div>
                <Pill tone={unit.status === "active" ? "moss" : "muted"}>
                  {unit.status === "active" ? "Ativa" : "Inativa"}
                </Pill>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FLAGS.filter((f) => (unit as any)[f.key]).map((f) => (
                  <Pill key={f.key} tone="muted">{f.label}</Pill>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => startEdit(unit)} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => toggleStatus.mutate(unit)} className="rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                  {unit.status === "active" ? "Desativar" : "Reativar"}
                </button>
                <button onClick={() => exportPdf(unit)} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                  <FileDown className="h-3.5 w-3.5" /> PDF
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
