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
  const [plan, setPlan] = useState({ name: "", audience: "clinic", stripe_price_id: "", unit_amount: "0" });
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
        stripe_price_id: plan.stripe_price_id,
        unit_amount: Math.round(Number(plan.unit_amount || 0) * 100),
        currency: "usd",
        interval: "month",
        created_by: user?.id,
        features: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan created");
      setPlan({ name: "", audience: "clinic", stripe_price_id: "", unit_amount: "0" });
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not save plan"),
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
            <button onClick={() => createPlan.mutate()} disabled={!plan.name || !plan.stripe_price_id} className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Save plan</button>
          </div>
        </Card>
      )}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {(plans.data ?? []).map((p: any) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{audienceLabel(p.audience)} - {p.stripe_price_id}</p>
              </div>
              <Pill tone={p.active ? "moss" : "muted"}>{p.active ? "active" : "inactive"}</Pill>
            </div>
            <p className="mt-4 text-3xl font-semibold text-olive">${((p.unit_amount ?? 0) / 100).toFixed(0)}<span className="text-sm text-muted-foreground">/{p.interval}</span></p>
          </Card>
        ))}
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
