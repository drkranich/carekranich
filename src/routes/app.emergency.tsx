import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Siren } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/emergency")({
  component: Emergency,
});

function Emergency() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [residentId, setResidentId] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const data = useQuery({
    queryKey: ["emergency-center", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [residents, alerts, locations] = await Promise.all([
        db.from("residents").select("id,tenant_id,full_name,preferred_name").order("full_name").limit(200),
        db.from("alerts").select("id,resident_id,title,description,severity,status,created_at,resolved_at").order("created_at", { ascending: false }).limit(100),
        db.from("address_locations").select("id,entity_id,address,city,state,country,latitude,longitude").eq("entity_type", "resident").limit(200),
      ]);
      const errors = [residents, alerts, locations].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return { residents: residents.data ?? [], alerts: alerts.data ?? [], locations: locations.data ?? [] };
    },
  });

  const activeEmergencies = (data.data?.alerts ?? []).filter((alert: any) => !["resolved", "closed"].includes(alert.status) && ["critical", "emergency", "high"].includes(alert.severity));

  const createSOS = async () => {
    if (!user) return;
    const selectedResident = (data.data?.residents ?? []).find((resident: any) => resident.id === residentId);
    const tenantId = profile?.tenant_id ?? selectedResident?.tenant_id;
    if (!tenantId) return toast.error("Select a resident with an organization before creating SOS.");
    setSending(true);
    try {
      const { error } = await (supabase as any).from("alerts").insert({
        tenant_id: tenantId,
        resident_id: residentId || null,
        created_by: user.id,
        title: "SOS emergency escalation",
        description: description.trim() || "Manual SOS triggered from emergency center.",
        severity: "critical",
        category: "emergency",
        status: "open",
      });
      if (error) throw error;
      toast.success("SOS alert created");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["emergency-center"] });
    } catch (err: any) {
      toast.error(err.message ?? "Could not create SOS alert");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Emergency center"
        subtitle="Creates and tracks real critical alerts. Phone and SMS dispatch can be connected after provider setup."
        action={<Pill tone={activeEmergencies.length ? "wine" : "moss"}>{activeEmergencies.length} active</Pill>}
      />

      {data.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading emergency records...</p>
      ) : data.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load emergency center.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(data.error as Error).message}</p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <Card className="border-wine/25 bg-wine/5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wine text-ivory">
                <Siren className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Create SOS alert</h2>
                <p className="text-sm text-muted-foreground">This writes a critical alert to Supabase.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <select value={residentId} onChange={(event) => setResidentId(event.target.value)} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm">
                <option value="">No resident selected</option>
                {(data.data?.residents ?? []).map((resident: any) => (
                  <option key={resident.id} value={resident.id}>{resident.preferred_name || resident.full_name}</option>
                ))}
              </select>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="What happened?" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <button onClick={createSOS} disabled={sending || (!profile?.tenant_id && !residentId)} className="w-full rounded-2xl bg-wine px-4 py-3 text-sm font-semibold text-ivory disabled:opacity-50">
                {sending ? "Creating..." : "Create critical alert"}
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-wine" />
              <h2 className="text-xl font-semibold text-foreground">Active emergency alerts</h2>
            </div>
            {activeEmergencies.length === 0 ? (
              <div className="mt-5">
                <EmptyState title="No active emergencies" hint="Critical alerts created here or in Alert center will appear here." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {activeEmergencies.map((alert: any) => (
                  <div key={alert.id} className="rounded-2xl border border-wine/20 bg-wine/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{alert.title}</p>
                      <Pill tone="wine">{alert.status}</Pill>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.description ?? "No description."}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground">Resident emergency addresses</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(data.data?.locations ?? []).map((location: any) => (
                <div key={location.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                  <p className="text-sm font-medium text-foreground">{location.address}</p>
                  <p className="text-xs text-muted-foreground">{[location.city, location.state, location.country].filter(Boolean).join(", ")}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {location.latitude && location.longitude ? `${location.latitude}, ${location.longitude}` : "No GPS coordinates"}
                  </p>
                </div>
              ))}
              {(data.data?.locations ?? []).length === 0 && <p className="text-sm text-muted-foreground">No resident addresses saved.</p>}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
