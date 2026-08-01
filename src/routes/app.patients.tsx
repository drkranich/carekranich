import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Pencil, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/patients")({ component: Patients });

type PatientRow = {
  id: string;
  tenant_id: string;
  unit_id: string | null;
  full_name: string;
  social_name: string | null;
  birth_date: string | null;
  sex: string | null;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  insurance_plan: string | null;
  insurance_number: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type AuthRow = {
  id: string;
  patient_id: string;
  granted_to: string;
  relationship: string;
  scope: string[];
  valid_until: string | null;
  status: string;
};

const EMPTY = {
  full_name: "",
  social_name: "",
  birth_date: "",
  sex: "",
  cpf: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  unit_id: "",
  insurance_plan: "",
  insurance_number: "",
  notes: "",
};

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function age(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth + "T00:00:00");
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function Patients() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [authFor, setAuthFor] = useState<string | null>(null);
  const [authDraft, setAuthDraft] = useState({ granted_to: "", relationship: "", valid_until: "" });

  const patients = useQuery({
    queryKey: ["patients", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PatientRow[];
    },
  });

  const units = useQuery({
    queryKey: ["patients-units", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinic_units")
        .select("id,name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const members = useQuery({
    queryKey: ["patients-members", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id,full_name,preferred_name")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string | null; preferred_name: string | null }>;
    },
  });

  const authorizations = useQuery({
    queryKey: ["patient-authorizations", authFor],
    enabled: !!authFor,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patient_authorizations")
        .select("*")
        .eq("patient_id", authFor)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AuthRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (patients.data ?? []).filter((p) => {
      if (!q) return true;
      return [p.full_name, p.social_name, p.cpf, p.phone, p.email, p.insurance_plan]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [patients.data, query]);

  const save = useMutation({
    mutationFn: async () => {
      if (form.full_name.trim().length < 3) throw new Error("Enter the patient full name.");
      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        social_name: form.social_name.trim() || null,
        birth_date: form.birth_date || null,
        sex: form.sex || null,
        cpf: form.cpf.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        unit_id: form.unit_id || null,
        insurance_plan: form.insurance_plan.trim() || null,
        insurance_number: form.insurance_number.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("patients").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.tenant_id = tenantId;
        const { error } = await (supabase as any).from("patients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Patient updated" : "Patient registered");
      setForm(EMPTY);
      setOpen(false);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save the patient"),
  });

  const grantAuth = useMutation({
    mutationFn: async () => {
      if (!authFor) return;
      if (!authDraft.granted_to) throw new Error("Selecione a pessoa autorizada.");
      if (!authDraft.relationship.trim()) throw new Error("Informe o vínculo (ex.: filha, responsável legal).");
      const { error } = await (supabase as any).from("patient_authorizations").insert({
        tenant_id: tenantId,
        patient_id: authFor,
        granted_to: authDraft.granted_to,
        relationship: authDraft.relationship.trim(),
        valid_until: authDraft.valid_until || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorização registrada");
      setAuthDraft({ granted_to: "", relationship: "", valid_until: "" });
      qc.invalidateQueries({ queryKey: ["patient-authorizations", authFor] });
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível registrar a autorização"),
  });

  const revokeAuth = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("patient_authorizations")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorização revogada");
      qc.invalidateQueries({ queryKey: ["patient-authorizations", authFor] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const memberName = (id: string) => {
    const m = (members.data ?? []).find((x) => x.id === id);
    return m?.preferred_name || m?.full_name || "Usuário";
  };

  const startEdit = (p: PatientRow) => {
    setEditingId(p.id);
    setForm({
      full_name: p.full_name,
      social_name: p.social_name ?? "",
      birth_date: p.birth_date ?? "",
      sex: p.sex ?? "",
      cpf: p.cpf ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
      unit_id: p.unit_id ?? "",
      insurance_plan: p.insurance_plan ?? "",
      insurance_number: p.insurance_number ?? "",
      notes: p.notes ?? "",
    });
    setOpen(true);
  };

  const exportPdf = (p: PatientRow) => {
    downloadPdf(`patient-${p.full_name}.pdf`, `Patient record — ${p.full_name}`, [
      `Nome social: ${p.social_name ?? "-"}`,
      `Nascimento: ${p.birth_date ? new Date(p.birth_date + "T00:00:00").toLocaleDateString("pt-BR") : "-"}  Idade: ${age(p.birth_date) ?? "-"}`,
      `Sexo: ${p.sex ?? "-"}  CPF: ${p.cpf ?? "-"}`,
      `Telefone: ${p.phone ?? "-"}  E-mail: ${p.email ?? "-"}`,
      `Cidade: ${p.city ?? "-"} / ${p.state ?? "-"}`,
      `Convênio: ${p.insurance_plan ?? "Particular"}  Carteirinha: ${p.insurance_number ?? "-"}`,
      `Status: ${p.status === "active" ? "Active" : "Inactive"}`,
      `Observações: ${p.notes ?? "-"}`,
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle="Diagnostic platform patient records, with family and guardian authorizations."
        action={
          <button
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY);
              setOpen(!open);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New patient
          </button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${glassInput} pl-11`}
          placeholder="Buscar por nome, CPF, telefone, convênio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {open && (
        <Card className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-foreground">
            {editingId ? "Edit patient" : "New patient"}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className={`${glassInput} md:col-span-2`} placeholder="Nome completo *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className={glassInput} placeholder="Nome social" value={form.social_name} onChange={(e) => setForm({ ...form, social_name: e.target.value })} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Data de nascimento</p>
              <GlassDatePicker value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Sexo biológico</p>
              <GlassSelect
                value={form.sex}
                onChange={(v) => setForm({ ...form, sex: v })}
                options={[
                  { value: "", label: "Não informar" },
                  { value: "feminino", label: "Feminino" },
                  { value: "masculino", label: "Masculino" },
                  { value: "intersexo", label: "Intersexo" },
                ]}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Unidade preferencial</p>
              <GlassSelect
                value={form.unit_id}
                onChange={(v) => setForm({ ...form, unit_id: v })}
                options={[
                  { value: "", label: "Sem unidade" },
                  ...(units.data ?? []).map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
            </div>
            <input className={glassInput} placeholder="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            <input className={glassInput} placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={glassInput} placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={glassInput} placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className={glassInput} placeholder="Estado (UF)" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <input className={glassInput} placeholder="Convênio" value={form.insurance_plan} onChange={(e) => setForm({ ...form, insurance_plan: e.target.value })} />
            <input className={glassInput} placeholder="Nº da carteirinha" value={form.insurance_number} onChange={(e) => setForm({ ...form, insurance_number: e.target.value })} />
            <input className={`${glassInput} md:col-span-2`} placeholder="Observações clínicas ou administrativas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
            >
              {save.isPending ? "Saving..." : editingId ? "Salvar alterações" : "Register patient"}
            </button>
            <button onClick={() => { setOpen(false); setEditingId(null); }} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
              Cancel
            </button>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No patient found" hint="Register patients to enable appointments, check-in, exams and results." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => (
            <Card key={p.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/15 text-olive">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{p.social_name || p.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {age(p.birth_date) !== null ? `${age(p.birth_date)} years old` : "Idade não informada"}
                      {p.insurance_plan ? ` · ${p.insurance_plan}` : " · Particular"}
                    </p>
                  </div>
                </div>
                <Pill tone={p.status === "active" ? "moss" : "muted"}>{p.status === "active" ? "Active" : "Inactive"}</Pill>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button onClick={() => setAuthFor(authFor === p.id ? null : p.id)} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                  <ShieldCheck className="h-3.5 w-3.5" /> Autorizações
                </button>
                <button onClick={() => exportPdf(p)} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 backdrop-blur-xl hover:bg-white/80">
                  <FileDown className="h-3.5 w-3.5" /> Ficha PDF
                </button>
              </div>

              {authFor === p.id && (
                <div className="space-y-3 rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
                  <p className="text-xs font-semibold text-foreground">
                    Authorized family members and guardians
                  </p>
                  {(authorizations.data ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">No authorization recorded.</p>
                  )}
                  {(authorizations.data ?? []).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {memberName(a.granted_to)} — {a.relationship}
                        {a.valid_until ? ` (até ${new Date(a.valid_until + "T00:00:00").toLocaleDateString("pt-BR")})` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <Pill tone={a.status === "active" ? "moss" : "muted"}>
                          {a.status === "active" ? "Ativa" : "Revogada"}
                        </Pill>
                        {a.status === "active" && (
                          <button onClick={() => revokeAuth.mutate(a.id)} className="text-wine hover:underline">
                            Revogar
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="grid gap-2 md:grid-cols-3">
                    <GlassSelect
                      value={authDraft.granted_to}
                      onChange={(v) => setAuthDraft({ ...authDraft, granted_to: v })}
                      options={[
                        { value: "", label: "Selecionar pessoa" },
                        ...(members.data ?? []).map((m) => ({
                          value: m.id,
                          label: m.preferred_name || m.full_name || "Usuário",
                        })),
                      ]}
                    />
                    <input
                      className={glassInput}
                      placeholder="Vínculo (ex.: filha)"
                      value={authDraft.relationship}
                      onChange={(e) => setAuthDraft({ ...authDraft, relationship: e.target.value })}
                    />
                    <GlassDatePicker
                      value={authDraft.valid_until}
                      onChange={(v) => setAuthDraft({ ...authDraft, valid_until: v })}
                    />
                  </div>
                  <button
                    onClick={() => grantAuth.mutate()}
                    disabled={grantAuth.isPending}
                    className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60"
                  >
                    Registrar autorização
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
