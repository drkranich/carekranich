import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Gate } from "@/components/app/Gate";

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
};

function Residents() {
  const qc = useQueryClient();
  const { profile, hasAnyRole } = useAuth();
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

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("residents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["residents"] }),
  });

  const canEdit = hasAnyRole(["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]);
  const canDelete = hasAnyRole(["clinic_admin", "super_admin"]);

  return (
    <>
      <PageHeader
        title="Residents"
        subtitle="People, not patients. Each profile is a living document co-built with family and care staff."
        action={
          <Gate
            roles={["caregiver", "nurse", "doctor", "clinic_admin", "super_admin"]}
            fallback={<Pill tone="gold">Read-only - family role</Pill>}
          >
            <button
              onClick={() => setCreating(true)}
              disabled={!profile?.tenant_id}
              title={!profile?.tenant_id ? "Join or create an organization first" : ""}
              className="rounded-full bg-olive px-4 py-2 text-xs text-ivory shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              + Add resident
            </button>
          </Gate>
        }
      />

      {!profile?.tenant_id && (
        <Card className="mb-6 border-gold/30 bg-gold/5">
          <p className="text-sm text-foreground">
            You're not part of an organization yet. Visit{" "}
            <span className="font-medium text-olive">Tenants</span> to create or join one before
            adding residents.
          </p>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : residents.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-xl font-semibold text-foreground">No residents yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            When you add someone, their story begins here.
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
                    {r.date_of_birth ? `${ageFrom(r.date_of_birth)} yrs` : "Age -"}
                    {r.language ? ` - ${r.language}` : ""}
                  </p>
                  {r.bio && <p className="mt-2 text-sm text-foreground/80 line-clamp-3">{r.bio}</p>}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditing(r)}
                    className="rounded-full border border-border bg-ivory px-3 py-1.5 text-xs hover:bg-cream"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => confirm(`Delete ${r.full_name}?`) && del.mutate(r.id)}
                    className="rounded-full border border-wine/30 px-3 py-1.5 text-xs text-wine hover:bg-wine/5"
                  >
                    Delete
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ResidentDialog
          resident={editing}
          tenantId={profile!.tenant_id!}
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
  tenantId,
  onClose,
  onSaved,
}: {
  resident: Resident | null;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
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
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
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
      ? supabase.from("residents").update(payload).eq("id", resident.id)
      : supabase.from("residents").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card p-8 shadow-elevated"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">
            {resident ? "Edit resident" : "Add a resident"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            x
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Capture the person behind the care.</p>

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
            placeholder="she / her"
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
            placeholder="Gardening, Reading"
          />
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
          <span className="text-foreground/80">Her / his story</span>
          <textarea
            value={form.story}
            onChange={(e) => setForm({ ...form, story: e.target.value })}
            rows={5}
            className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
            placeholder="Where she grew up, what she loves, what calms her, what she fears."
          />
        </label>

        {err && <p className="mt-4 rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-ivory px-4 py-2 text-sm hover:bg-cream"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-full bg-olive px-5 py-2 text-sm text-ivory hover:opacity-90 disabled:opacity-50"
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
