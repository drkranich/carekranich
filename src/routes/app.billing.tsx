import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/billing")({ component: Billing });

const audienceOptions = [
  { value: "family", label: "Familia" },
  { value: "clinic", label: "Clinica" },
  { value: "service_provider", label: "Prestador de servicos" },
];

const audienceLabel = (value: string) =>
  audienceOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");

function Billing() {
  const { isAdmin, isSuperAdmin, profile, user } = useAuth();
  const qc = useQueryClient();
  const [plan, setPlan] = useState({
    name: "",
    audience: "clinic",
    description: "",
    stripe_price_id: "",
    unit_amount: "0",
    resident_limit: "",
    seat_limit: "",
    features: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const plans = useQuery({
    queryKey: ["platform-plans"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("platform_plans").select("*").order("unit_amount");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subscriptions = useQuery({
    queryKey: ["tenant-subscriptions", profile?.tenant_id, isSuperAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenant_subscriptions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("platform_plans").insert({
        name: plan.name,
        audience: plan.audience,
        description: plan.description,
        stripe_price_id: plan.stripe_price_id,
        unit_amount: Math.round(Number(plan.unit_amount || 0) * 100),
        currency: "usd",
        interval: "month",
        resident_limit: plan.resident_limit ? Number(plan.resident_limit) : null,
        seat_limit: plan.seat_limit ? Number(plan.seat_limit) : null,
        created_by: user?.id,
        features: featuresFromText(plan.features),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan created");
      setPlan({
        name: "",
        audience: "clinic",
        description: "",
        stripe_price_id: "",
        unit_amount: "0",
        resident_limit: "",
        seat_limit: "",
        features: "",
      });
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not save plan"),
  });

  const updatePlan = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await (supabase as any)
        .from("platform_plans")
        .update({
          name: item.name,
          audience: item.audience,
          description: item.description,
          stripe_price_id: item.stripe_price_id,
          currency: item.currency || "usd",
          unit_amount: Math.round(Number(item.unit_amount_display || 0) * 100),
          interval: item.interval || "month",
          resident_limit: item.resident_limit_display ? Number(item.resident_limit_display) : null,
          seat_limit: item.seat_limit_display ? Number(item.seat_limit_display) : null,
          features: featuresFromText(item.features_text),
          active: !!item.active,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan updated");
      setEditingId(null);
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not update plan"),
  });

  const revoke = async (subscription: any) => {
    const next = subscription.access_status === "revoked" ? "active" : "revoked";
    const { error } = await (supabase as any)
      .from("tenant_subscriptions")
      .update({
        access_status: next,
        revoked_at: next === "revoked" ? new Date().toISOString() : null,
        revoked_by: next === "revoked" ? user?.id : null,
        revocation_reason: next === "revoked" ? "Manual super admin payment control" : null,
      })
      .eq("id", subscription.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next === "revoked" ? "Access revoked" : "Access restored");
      qc.invalidateQueries({ queryKey: ["tenant-subscriptions", profile?.tenant_id, isSuperAdmin] });
    }
  };

  return (
    <>
      <PageHeader
        title="Plans & billing"
        subtitle="Plans stay connected to Stripe Price IDs so billing can sync without changing values manually in Stripe."
        action={<Pill tone="olive">Stripe Price ID ready</Pill>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Plans" value={plans.data?.length ?? "-"} sub="Editable catalog" tone="olive" />
        <Stat label="Subscriptions" value={subscriptions.data?.length ?? "-"} sub="Tenant access" tone="moss" />
        <Stat label="Revoked" value={(subscriptions.data ?? []).filter((s: any) => s.access_status === "revoked").length} sub="Payment blocked" tone="wine" />
      </div>
      {isSuperAdmin && (
        <Card className="mt-6">
          <h2 className="text-xl font-semibold text-foreground">Create plan</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} placeholder="Plan name" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <GlassSelect
              value={plan.audience}
              onChange={(value) => setPlan({ ...plan, audience: value })}
              options={audienceOptions}
            />
            <input value={plan.stripe_price_id} onChange={(e) => setPlan({ ...plan, stripe_price_id: e.target.value })} placeholder="price_..." className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={plan.unit_amount} onChange={(e) => setPlan({ ...plan, unit_amount: e.target.value })} placeholder="Monthly price" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={plan.resident_limit} onChange={(e) => setPlan({ ...plan, resident_limit: e.target.value })} placeholder="Resident limit" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={plan.seat_limit} onChange={(e) => setPlan({ ...plan, seat_limit: e.target.value })} placeholder="Seat limit" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} placeholder="Plan description" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-2" />
            <textarea value={plan.features} onChange={(e) => setPlan({ ...plan, features: e.target.value })} placeholder="One feature per line" rows={3} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-3" />
            <button onClick={() => createPlan.mutate()} disabled={!plan.name || !plan.stripe_price_id} className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Save plan</button>
          </div>
        </Card>
      )}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {(plans.data ?? []).map((p: any) => {
          const isEditing = editingId === p.id;
          const current = isEditing ? draft : planToDraft(p);
          return (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                {isEditing ? (
                  <input
                    value={current.name}
                    onChange={(e) => setDraft({ ...current, name: e.target.value })}
                    className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-lg font-semibold text-foreground shadow-soft"
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{audienceLabel(p.audience)}</p>
              </div>
              <Pill tone={p.active ? "moss" : "muted"}>{p.active ? "active" : "inactive"}</Pill>
            </div>
            {isEditing ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <GlassSelect
                  value={current.audience}
                  onChange={(value) => setDraft({ ...current, audience: value })}
                  options={audienceOptions}
                />
                <input value={current.unit_amount_display} onChange={(e) => setDraft({ ...current, unit_amount_display: e.target.value })} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <input value={current.stripe_price_id ?? ""} onChange={(e) => setDraft({ ...current, stripe_price_id: e.target.value })} placeholder="Stripe Price ID" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-2" />
                <input value={current.resident_limit_display} onChange={(e) => setDraft({ ...current, resident_limit_display: e.target.value })} placeholder="Resident limit" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <input value={current.seat_limit_display} onChange={(e) => setDraft({ ...current, seat_limit_display: e.target.value })} placeholder="Seat limit" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <textarea value={current.description ?? ""} onChange={(e) => setDraft({ ...current, description: e.target.value })} rows={3} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-2" />
                <textarea value={current.features_text} onChange={(e) => setDraft({ ...current, features_text: e.target.value })} rows={5} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-2" />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={current.active} onChange={(e) => setDraft({ ...current, active: e.target.checked })} className="h-4 w-4 accent-olive" />
                  Plano ativo
                </label>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setEditingId(null); setDraft(null); }} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <button onClick={() => updatePlan.mutate(current)} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">Save changes</button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-4 text-3xl font-semibold text-olive">${((p.unit_amount ?? 0) / 100).toFixed(0)}<span className="text-sm text-muted-foreground">/{p.interval}</span></p>
                {p.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{p.description}</p>}
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/45 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Stripe Price ID</p>
                  <code className="mt-1 block break-all text-xs text-olive">{p.stripe_price_id ?? "Nao configurado"}</code>
                </div>
                <ul className="mt-4 grid gap-2 text-sm text-foreground/80">
                  {(Array.isArray(p.features) ? p.features : []).map((feature: string) => (
                    <li key={feature} className="rounded-xl bg-white/45 px-3 py-2">{feature}</li>
                  ))}
                </ul>
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setDraft(planToDraft(p));
                    }}
                    className="mt-4 rounded-full border border-olive/25 bg-white/50 px-3 py-1.5 text-xs text-olive"
                  >
                    Edit plan
                  </button>
                )}
              </>
            )}
          </Card>
        );
        })}
      </div>
      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Access by payment status</h2>
        <div className="mt-4 space-y-3">
          {(subscriptions.data ?? []).map((s: any) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/50 p-4">
              <div>
                <p className="font-medium text-foreground">{s.stripe_subscription_id ?? s.id}</p>
                <p className="text-xs text-muted-foreground">{s.status} - {s.access_status} - {s.stripe_price_id ?? "no price"}</p>
              </div>
              {isSuperAdmin && <button onClick={() => revoke(s)} className="rounded-full border border-wine/25 px-3 py-1.5 text-xs text-wine">{s.access_status === "revoked" ? "Restore access" : "Revoke access"}</button>}
            </div>
          ))}
          {subscriptions.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No subscriptions yet.</p>}
        </div>
      </Card>
    </>
  );
}

function featuresFromText(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function planToDraft(plan: any) {
  return {
    ...plan,
    unit_amount_display: ((plan.unit_amount ?? 0) / 100).toFixed(0),
    resident_limit_display: plan.resident_limit ? String(plan.resident_limit) : "",
    seat_limit_display: plan.seat_limit ? String(plan.seat_limit) : "",
    features_text: Array.isArray(plan.features) ? plan.features.join("\n") : "",
  };
}
