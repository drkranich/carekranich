import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, PageHeader, Pill, Avatar } from "@/components/app/primitives";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({ component: Profile });

function Profile() {
  const { user, profile, roles, primaryRole, refresh, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [tz, setTz] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPreferredName(profile.preferred_name ?? "");
      setPhone(profile.phone ?? "");
      setTz(profile.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [profile]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!user || !profile) return <Navigate to="/login" />;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, preferred_name: preferredName, phone, time_zone: tz,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Profile updated"); await refresh(); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: ue } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (ue) { setUploading(false); return toast.error(ue.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: pe } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
    setUploading(false);
    if (pe) toast.error(pe.message); else { toast.success("Photo updated"); await refresh(); }
  };

  return (
    <>
      <PageHeader
        title="Your profile"
        subtitle="How the platform recognizes you."
        action={<Pill tone="olive">{primaryRole ? ROLE_LABELS[primaryRole] : "Member"}</Pill>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar name={profile.full_name ?? user.email ?? "?"} src={profile.avatar_url} size={120} tone="olive" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full bg-olive p-2 text-ivory shadow-soft hover:opacity-90"
                title="Change photo"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
            <h2 className="mt-4 font-display text-2xl">{profile.preferred_name || profile.full_name || "Unnamed"}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {uploading && <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>}

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {roles.map((r) => <Pill key={r} tone="moss">{ROLE_LABELS[r]}</Pill>)}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Personal details</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Preferred name" value={preferredName} onChange={setPreferredName} hint="Used for greetings everywhere" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+351 912 345 678" />
            <Field label="Time zone" value={tz} onChange={setTz} placeholder="Europe/Lisbon" />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={save} disabled={saving} className="rounded-full bg-olive px-5 py-2 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Account & security</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-2xl bg-cream/40 p-4">
              <p className="text-foreground">Password</p>
              <p className="mt-1 text-xs text-muted-foreground">Reset via your email link.</p>
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
                    redirectTo: `${window.location.origin}/login`,
                  });
                  if (error) toast.error(error.message); else toast.success("Reset email sent");
                }}
                className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-cream"
              >Send reset link</button>
            </div>
            <div className="rounded-2xl bg-cream/40 p-4">
              <p className="text-foreground">Two-factor auth</p>
              <p className="mt-1 text-xs text-muted-foreground">Coming soon — TOTP & passkeys.</p>
            </div>
            <div className="rounded-2xl bg-cream/40 p-4">
              <p className="text-foreground">Sessions</p>
              <p className="mt-1 text-xs text-muted-foreground">Active on this device.</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-foreground/80">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
