import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GeoAddressField } from "@/components/app/GeoAddressField";
import type { GeoAddress } from "@/lib/geocoding";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
}

function Onboarding() {
  const { user, profile, loading, refresh } = useAuth();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [orgName, setOrgName] = useState("");
  const [userKind, setUserKind] = useState<"clinic" | "family" | "service_provider">("clinic");
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile?.tenant_id && profile.account_status === "active") return <Navigate to="/app" />;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const slug = `${slugify(orgName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await (supabase as any).rpc("request_new_tenant", {
        _name: orgName,
        _slug: slug,
        _user_kind: userKind,
        _address: address ?? {},
      });
      if (error) throw error;
      await refresh();
      setErr("Request sent. Care Kranich must approve this account before access is released.");
    } catch (e: any) { setErr(e.message ?? "Failed to request organization approval"); }
    finally { setBusy(false); }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { error } = await (supabase as any).rpc("request_join_by_invite", {
        _invite_code: code.trim(),
      });
      if (error) throw error;
      await refresh();
      setErr("Request sent. A super admin must approve this user before access is released.");
    } catch (e: any) { setErr(e.message ?? "Failed to request access"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" /></svg>
          </div>
          <span className="font-display text-xl text-olive">Care Kranich</span>
        </div>
        <h1 className="mt-6 font-display text-2xl text-foreground">Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your care organization or join one with an invite code.</p>

        {profile?.account_status && profile.account_status !== "active" && profile.tenant_id && (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            profile.account_status === "rejected"
              ? "border-wine/25 bg-wine/10 text-wine"
              : "border-gold/25 bg-gold/10 text-foreground"
          }`}>
            {profile.account_status === "rejected"
              ? "This access request was rejected. Contact Care Kranich support before trying again."
              : "Your access request is pending super admin approval. You will enter the SaaS after approval."}
          </div>
        )}

        <div className="mt-6 inline-flex rounded-full border border-border bg-ivory p-1 text-sm">
          <button onClick={() => setMode("create")} className={`rounded-full px-4 py-1.5 ${mode === "create" ? "bg-olive text-ivory" : "text-foreground/70"}`}>Create organization</button>
          <button onClick={() => setMode("join")} className={`rounded-full px-4 py-1.5 ${mode === "join" ? "bg-olive text-ivory" : "text-foreground/70"}`}>Join with code</button>
        </div>

        {mode === "create" ? (
          <form onSubmit={create} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground/80">Account type</span>
              <select value={userKind} onChange={(e) => setUserKind(e.target.value as any)} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40">
                <option value="clinic">Clinic / care company</option>
                <option value="service_provider">Health service provider / advertiser</option>
                <option value="family">Family / individual client</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-foreground/80">Organization name</span>
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Lopes Family Care" className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <GeoAddressField label="Registered address" value={address} onChange={setAddress} />
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">This creates an approval request. No admin access is released until the super admin approves it.</p>
            {err && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}
            <button disabled={busy} className="w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
              {busy ? "Sending..." : "Request approval"}
            </button>
          </form>
        ) : (
          <form onSubmit={join} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground/80">Invite code</span>
              <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. a1b2c3d4e5" className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">Ask your organization's admin for the invite code. The request still waits for super admin approval.</p>
            {err && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}
            <button disabled={busy} className="w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
              {busy ? "Sending..." : "Request access"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
