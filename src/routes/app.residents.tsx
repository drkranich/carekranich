import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CrudActions } from "@/components/app/CrudActions";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Gate } from "@/components/app/Gate";
import { GeoAddressField } from "@/components/app/GeoAddressField";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import type { GeoAddress } from "@/lib/geocoding";

export const Route = createFileRoute("/app/residents")({ component: Residents });

type Resident = {
  id: string;
  full_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  bio: string | null;
  story: string | null;
  pronouns: string | null;
  language: string | null;
  hobbies: string[] | null;
  tenant_id: string;
  created_at: string;
  archived_at?: string | null;
};

type TenantOption = { id: string; name: string };

function Residents() {
  const qc = useQueryClient();
  const { profile, hasAnyRole, isSuperAdmin } = useAuth();
  const [editing, setEditing] = useState<Resident | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Resident[];
    },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["resident-tenant-options", isSuperAdmin, profile?.tenant_id],
    enabled: isSuperAdmin || !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select("id,name")
        .order("name", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TenantOption[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("residents").delete().eq("id", id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Resident was not deleted. Check your permissions.");
    },
    onSuccess: () => {
      toast.success("Resident deleted");
      qc.invalidateQueries({ queryKey: ["residents"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not delete"),
  });

  const archiveResident = async (resident: Resident) => {
    const archive = !resident.archived_at;
    const { data, error } = await (supabase as any)
      .from("residents")
      .update({ archived_at: archive ? new Date().toISOString() : null })
      .eq("id", resident.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Resident was not archived. Check your permissions.");
    toast.success(archive ? "Resident archived" : "Resident restored");
    qc.invalidateQueries({ queryKey: ["residents"] });
  };

  const shareResident = async (resident: Resident) => {
    const text = [
      `Resident: ${resident.full_name}`,
      resident.preferred_name ? `Preferred name: ${resident.preferred_name}` : "",
      resident.date_of_birth ? `Birth date: ${resident.date_of_birth}` : "",
      resident.language ? `Language: ${resident.language}` : "",
      resident.bio ? `Bio: ${resident.bio}` : "",
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Resident summary copied");
    } catch {
      window.prompt("Copy the resident summary:", text);
    }
  };

  const canEdit = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const canDelete = hasAnyRole(["clinic_admin", "super_admin"]);

  return (
    <>
      <PageHeader
        title="Residents"
        subtitle="People, not patients. Each profile is a living document built with the family and care team."
        action={
          <Gate
            roles={["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]}
            fallback={<Pill tone="gold">Read-only - family profile</Pill>}
          >
            <button
              onClick={() => setCreating(true)}
              disabled={!profile?.tenant_id && !isSuperAdmin}
              title={!profile?.tenant_id && !isSuperAdmin ? "Create or select an organization before adding residents" : ""}
              className="rounded-lg bg-olive px-4 py-2 text-xs text-ivory shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              + Add resident
            </button>
          </Gate>
        }
      />

      {!profile?.tenant_id && !isSuperAdmin && (
        <Card className="mb-6 border-gold/30 bg-gold/5">
          <p className="text-sm text-foreground">
            You are not part of an organization yet. Visit{" "}
            <span className="font-medium text-olive">Organizations</span> to create or join one
            before adding residents.
          </p>
        </Card>
      )}

      {!profile?.tenant_id && isSuperAdmin && (
        <Card className="mb-6 border-olive/25 bg-olive/5">
          <p className="text-sm text-foreground">
            Super admin global view. Residents from approved organizations appear here; creating a
            resident still requires an organization context.
          </p>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : residents.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-xl font-semibold text-foreground">No residents yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            When you add someone, that person's story starts here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {residents.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-4">
                <Avatar name={r.preferred_name ?? r.full_name} tone="wine" size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-foreground truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.date_of_birth ? `${ageFrom(r.date_of_birth)} years old` : "Idade -"}
                    {r.language ? ` - ${r.language}` : ""}
                  </p>
                  {r.bio && <p className="mt-2 text-sm text-foreground/80 line-clamp-3">{r.bio}</p>}
                </div>
              </div>
              <CrudActions
                className="mt-4"
                onEdit={canEdit ? () => setEditing(r) : undefined}
                onArchive={canEdit && "archived_at" in r ? () => archiveResident(r) : undefined}
                archiveLabel={r.archived_at ? "Restaurar" : "Archive"}
                onShare={() => shareResident(r)}
                onDelete={canDelete ? () => confirm(`Delete ${r.full_name}?`) && del.mutate(r.id) : undefined}
              />
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (profile?.tenant_id || isSuperAdmin) && (
        <ResidentDialog
          resident={editing}
          initialTenantId={editing?.tenant_id ?? profile?.tenant_id ?? tenants[0]?.id ?? ""}
          tenantOptions={tenants}
          requireTenantPicker={isSuperAdmin && !profile?.tenant_id}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["residents"] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function ageFrom(dob: string) {
  const d = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a;
}

function ResidentDialog({
  resident,
  initialTenantId,
  tenantOptions,
  requireTenantPicker,
  onClose,
  onSaved,
}: {
  resident: Resident | null;
  initialTenantId: string;
  tenantOptions: TenantOption[];
  requireTenantPicker: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [form, setForm] = useState({
    full_name: resident?.full_name ?? "",
    preferred_name: resident?.preferred_name ?? "",
    date_of_birth: resident?.date_of_birth ?? "",
    pronouns: resident?.pronouns ?? "",
    language: resident?.language ?? "",
    bio: resident?.bio ?? "",
    story: resident?.story ?? "",
    hobbies: (resident?.hobbies ?? []).join(", "),
  });
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!tenantId) {
      setErr("Select an organization before creating the resident.");
      return;
    }
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      full_name: form.full_name.trim(),
      preferred_name: form.preferred_name.trim() || null,
      date_of_birth: form.date_of_birth || null,
      pronouns: form.pronouns.trim() || null,
      language: form.language.trim() || null,
      bio: form.bio.trim() || null,
      story: form.story.trim() || null,
      hobbies: form.hobbies
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const op = resident
      ? supabase.from("residents").update(payload).eq("id", resident.id).select("id").single()
      : supabase.from("residents").insert(payload).select("id").single();
    const { data, error } = await op;
    setSaving(false);
    if (error) return setErr(error.message);
    if (address && data?.id) {
      const { error: locationError } = await (supabase as any).from("address_locations").upsert(
        {
          tenant_id: tenantId,
          entity_type: "resident",
          entity_id: data.id,
          label: "primary",
          address: address.address,
          city: address.city,
          state: address.state,
          country: address.country,
          country_code: address.country_code,
          postal_code: address.postal_code,
          latitude: address.latitude,
          longitude: address.longitude,
          raw: address.raw ?? {},
        },
        { onConflict: "entity_type,entity_id,label" },
      );
      if (locationError) return setErr(locationError.message);
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/70 bg-white/72 shadow-elevated backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/55 px-8 pb-4 pt-7">
          <h2 className="text-2xl font-semibold text-foreground">
            {resident ? "Edit resident" : "Add resident"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            x
          </button>
        </div>

        <div className="app-scrollbar overflow-y-auto px-8 pb-6 pr-6">
        <p className="mt-4 text-sm text-muted-foreground">Register the person behind the care.</p>

        {requireTenantPicker && (
          <div className="mt-5">
            <label className="block text-sm">
              <span className="text-foreground/80">Organization</span>
              <GlassSelect
                value={tenantId}
                onChange={setTenantId}
                className="mt-1"
                placeholder="Select an organization"
                options={tenantOptions.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
              />
            </label>
            {tenantOptions.length === 0 && (
              <p className="mt-2 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs text-foreground">
                No organization exists yet. Create or approve an organization before registering residents.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field
            label="Full name"
            required
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
          />
          <Field
            label="Preferred name"
            value={form.preferred_name}
            onChange={(v) => setForm({ ...form, preferred_name: v })}
          />
          <Field
            label="Date of birth"
            type="date"
            value={form.date_of_birth}
            onChange={(v) => setForm({ ...form, date_of_birth: v })}
          />
          <Field
            label="Pronouns"
            value={form.pronouns}
            onChange={(v) => setForm({ ...form, pronouns: v })}
            placeholder="ela / dela"
          />
          <Field
            label="Language"
            value={form.language}
            onChange={(v) => setForm({ ...form, language: v })}
            placeholder="Portuguese - French"
          />
          <Field
            label="Hobbies (comma-separated)"
            value={form.hobbies}
            onChange={(v) => setForm({ ...form, hobbies: v })}
            placeholder="Jardinagem, Leitura"
          />
        </div>

        <div className="mt-4">
          <GeoAddressField label="Care address" value={address} onChange={setAddress} />
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-foreground/80">Short biography</span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="text-foreground/80">Their story</span>
          <textarea
            value={form.story}
            onChange={(e) => setForm({ ...form, story: e.target.value })}
            rows={5}
            className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
            placeholder="Where they grew up, what they love, what calms them, and what they fear."
          />
        </label>

        {err && <p className="mt-4 rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/55 bg-white/42 px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-ivory px-4 py-2 text-sm hover:bg-cream"
          >
            Cancel
          </button>
          <button
            disabled={saving || !tenantId}
            className="rounded-lg bg-olive px-5 py-2 text-sm text-ivory hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : resident ? "Save changes" : "Create resident"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  if (type === "date") {
    return (
      <label className="block text-sm">
        <span className="text-foreground/80">
          {label}
          {required && " *"}
        </span>
        <div className="mt-1">
          <GlassDatePicker value={value} onChange={onChange} />
        </div>
      </label>
    );
  }
  return (
    <label className="block text-sm">
      <span className="text-foreground/80">
        {label}
        {required && " *"}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
      />
    </label>
  );
}
