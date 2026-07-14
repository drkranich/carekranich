import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
}

function Onboarding() {
  const { user, profile, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [orgName, setOrgName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loadingâ€¦</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile?.tenant_id) return <Navigate to="/app" />;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const slug = `${slugify(orgName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: t, error: te } = await supabase
        .from("tenants").insert({ name: orgName, slug }).select("id").single();
      if (te) throw te;
      const { error: pe } = await supabase.from("profiles").update({ tenant_id: t.id }).eq("id", user.id);
      if (pe) throw pe;
      const { error: re } = await supabase.from("user_roles").insert({ user_id: user.id, role: "clinic_admin", tenant_id: t.id });
      if (re) throw re;
      await refresh();
      navigate({ to: "/app" });
    } catch (e: any) { setErr(e.message ?? "Failed to create organization"); }
    finally { setBusy(false); }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { data: t, error: te } = await supabase
        .from("tenants").select("id,name").eq("invite_code", code.trim()).maybeSingle();
      if (te) throw te;
      if (!t) throw new Error("Invalid invite code");
      const { error: pe } = await supabase.from("profiles").update({ tenant_id: t.id }).eq("id", user.id);
      if (pe) throw pe;
      const { error: re } = await supabase.from("user_roles").insert({ user_id: user.id, role: "family", tenant_id: t.id });
      if (re) throw re;
      await refresh();
      navigate({ to: "/app" });
    } catch (e: any) { setErr(e.message ?? "Failed to join"); }
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

        <div className="mt-6 inline-flex rounded-full border border-border bg-ivory p-1 text-sm">
          <button onClick={() => setMode("create")} className={`rounded-full px-4 py-1.5 ${mode === "create" ? "bg-olive text-ivory" : "text-foreground/70"}`}>Create organization</button>
          <button onClick={() => setMode("join")} className={`rounded-full px-4 py-1.5 ${mode === "join" ? "bg-olive text-ivory" : "text-foreground/70"}`}>Join with code</button>
        </div>

        {mode === "create" ? (
          <form onSubmit={create} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground/80">Organization name</span>
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Lopes Family Care" className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">You'll become the clinic admin. You can invite family and care staff afterward.</p>
            {err && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}
            <button disabled={busy} className="w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
              {busy ? "Creatingâ€¦" : "Create organization"}
            </button>
          </form>
        ) : (
          <form onSubmit={join} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground/80">Invite code</span>
              <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. a1b2c3d4e5" className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">Ask your organization's admin for the invite code. You'll join as a family member by default; admins can elevate your role.</p>
            {err && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}
            <button disabled={busy} className="w-full rounded-full bg-olive px-4 py-2.5 text-sm text-ivory hover:opacity-90 disabled:opacity-50">
              {busy ? "Joiningâ€¦" : "Join organization"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
