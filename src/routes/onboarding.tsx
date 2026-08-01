import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, HeartHandshake, KeyRound, Sparkles, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GeoAddressField } from "@/components/app/GeoAddressField";
import type { GeoAddress } from "@/lib/geocoding";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
}

type UseKind = "clinic" | "family" | "service_provider";

const USE_OPTIONS: { value: UseKind | "join"; title: string; description: string; icon: typeof Building2 }[] = [
  {
    value: "clinic",
    title: "I represent a clinic or institution",
    description: "Care home, home care agency, clinic or hospital caring for residents and patients.",
    icon: Building2,
  },
  {
    value: "family",
    title: "I want to monitor a loved one",
    description: "Follow routines, health and alerts for someone you love in real time.",
    icon: HeartHandshake,
  },
  {
    value: "service_provider",
    title: "I am a service provider",
    description: "Caregivers, nurses and professionals serving through the Care Kranich ecosystem.",
    icon: Stethoscope,
  },
  {
    value: "join",
    title: "I have an invite code",
    description: "Join an existing organization as invited staff or family.",
    icon: KeyRound,
  },
];

function Onboarding() {
  const { user, profile, loading, refresh } = useAuth();
  const [step, setStep] = useState<"use" | "plans" | "form" | "join">("use");
  const [userKind, setUserKind] = useState<UseKind>("clinic");
  const [orgName, setOrgName] = useState("");
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const plans = useQuery({
    queryKey: ["onboarding-plans"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_plans")
        .select("id,name,audience,description,unit_amount,interval,features,active")
        .eq("active", true)
        .order("unit_amount");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile?.tenant_id && profile.account_status === "active") return <Navigate to="/app" />;

  const pickUse = (value: UseKind | "join") => {
    setErr(null);
    if (value === "join") return setStep("join");
    setUserKind(value);
    setStep("plans");
  };

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
      // Activates the 15-day trial for the newly requested organization.
      const { data: fresh } = await (supabase as any)
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();
      if (fresh?.tenant_id) {
        await (supabase as any).rpc("start_trial", { _tenant_id: fresh.tenant_id });
      }
      setErr("Request sent with a 15-day trial reserved. The Care Kranich team will approve your access soon.");
    } catch (e: any) { setErr(e.message ?? "Could not request organization creation"); }
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
      setErr("Request sent. An administrator must approve your access before release.");
    } catch (e: any) { setErr(e.message ?? "Could not request access"); }
    finally { setBusy(false); }
  };

  const plansForKind = (plans.data ?? []).filter((plan: any) => plan.audience === userKind);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/70 bg-white/60 p-8 shadow-soft backdrop-blur-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-olive text-ivory">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" /></svg>
          </div>
          <span className="font-display text-xl text-olive">Care Kranich</span>
        </div>
        <h1 className="mt-6 font-display text-2xl text-foreground">
          Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>

        {profile?.account_status && profile.account_status !== "active" && profile.tenant_id && (
          <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            profile.account_status === "rejected"
              ? "border-wine/25 bg-wine/10 text-wine"
              : "border-gold/25 bg-gold/10 text-foreground"
          }`}>
            {profile.account_status === "rejected"
              ? "This access request was rejected. Contact Care Kranich support before trying again."
              : "Your access request is awaiting approval. You will enter the SaaS as soon as it is approved."}
          </div>
        )}

        {step === "use" && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">To begin, tell us how you will use the platform.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {USE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => pickUse(option.value)}
                    className="rounded-2xl border border-white/70 bg-white/50 p-5 text-left shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-olive/40 hover:bg-white/75"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 font-semibold text-foreground">{option.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "plans" && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Plans for {userKind === "clinic" ? "clinics and institutions" : userKind === "family" ? "families" : "service providers"} - all start with
              <span className="font-semibold text-olive"> a free 15-day trial</span>, no card required.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {plansForKind.map((plan: any) => (
                <div key={plan.id} className="rounded-2xl border border-white/70 bg-white/50 p-5 shadow-soft backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{plan.name}</p>
                    <span className="rounded-full bg-baby/40 px-2.5 py-1 text-[10px] font-semibold uppercase text-olive">15 free days</span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-olive">
                    ${((plan.unit_amount ?? 0) / 100).toFixed(0)}
                    <span className="text-xs text-muted-foreground">/{plan.interval === "month" ? "month" : plan.interval}</span>
                  </p>
                  {plan.description && <p className="mt-2 text-xs leading-5 text-muted-foreground">{plan.description}</p>}
                  <ul className="mt-3 space-y-1">
                    {(Array.isArray(plan.features) ? plan.features.slice(0, 4) : []).map((feature: string) => (
                      <li key={feature} className="flex items-center gap-1.5 text-xs text-foreground/80">
                        <Sparkles className="h-3 w-3 flex-none text-olive" /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {plansForKind.length === 0 && !plans.isLoading && (
                <p className="rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-foreground md:col-span-2">
                  Plans for this profile are being prepared - you still start with the standard free 15-day trial.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => setStep("form")} className="rounded-full bg-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:opacity-90">
                Start free 15-day trial
              </button>
              <button onClick={() => setStep("use")} className="rounded-full border border-border bg-white/55 px-4 py-2.5 text-sm">
                Back
              </button>
            </div>
          </>
        )}

        {step === "form" && (
          <form onSubmit={create} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {userKind === "family"
                ? "Name your family care space (e.g. Lopes Family)."
                : "Your organization details so we can create the workspace."}
            </p>
            <label className="block text-sm">
              <span className="text-foreground/80">{userKind === "family" ? "Family space name *" : "Organization name *"}</span>
              <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={userKind === "family" ? "Lopes Family" : "Vita Plena Clinic"} className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <GeoAddressField label="Address" value={address} onChange={setAddress} />
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">
              Your 15-day trial is reserved now. Access is released after Care Kranich team approval.
            </p>
            {err && <p className="rounded-lg bg-moss/10 px-3 py-2 text-xs text-foreground">{err}</p>}
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className="rounded-full bg-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:opacity-90 disabled:opacity-50">
                {busy ? "Sending..." : "Create and start free trial"}
              </button>
              <button type="button" onClick={() => setStep("plans")} className="rounded-full border border-border bg-white/55 px-4 py-2.5 text-sm">
                Back
              </button>
            </div>
          </form>
        )}

        {step === "join" && (
          <form onSubmit={join} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="text-foreground/80">Invite code *</span>
              <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex.: a1b2c3d4e5" className="mt-1 w-full rounded-xl border border-border bg-ivory px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-olive/40" />
            </label>
            <p className="rounded-xl bg-cream/60 px-3 py-2 text-xs text-muted-foreground">
              Ask the organization administrator for the code. The request still goes through approval.
            </p>
            {err && <p className="rounded-lg bg-wine/10 px-3 py-2 text-xs text-wine">{err}</p>}
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} className="rounded-full bg-olive px-6 py-2.5 text-sm font-semibold text-ivory hover:opacity-90 disabled:opacity-50">
                {busy ? "Sending..." : "Request access"}
              </button>
              <button type="button" onClick={() => setStep("use")} className="rounded-full border border-border bg-white/55 px-4 py-2.5 text-sm">
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

