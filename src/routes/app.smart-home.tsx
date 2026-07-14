import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/smart-home")({
  component: SmartHome,
});

function SmartHome() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [residentId, setResidentId] = useState("");
  const [draft, setDraft] = useState({ metric: "", value_text: "", domain: "environment", notes: "" });

  const home = useQuery({
    queryKey: ["smart-home-real", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [residents, observations, alerts] = await Promise.all([
        db.from("residents").select("id,tenant_id,full_name,preferred_name").order("full_name").limit(200),
        db.from("twin_observations").select("id,resident_id,domain,metric,value_numeric,value_text,unit,source,observed_at,notes").order("observed_at", { ascending: false }).limit(300),
        db.from("alerts").select("id,resident_id,title,severity,status,category,created_at").in("category", ["smart_home", "smart-home", "home", "safety", "environmental"]).order("created_at", { ascending: false }).limit(100),
      ]);
      const errors = [residents, observations, alerts].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return { residents: residents.data ?? [], observations: observations.data ?? [], alerts: alerts.data ?? [] };
    },
  });

  const selectedResident = (home.data?.residents ?? []).find((item: any) => item.id === residentId) ?? (home.data?.residents ?? [])[0] ?? null;
  const observations = selectedResident ? (home.data?.observations ?? []).filter((item: any) => item.resident_id === selectedResident.id) : [];
  const alerts = selectedResident ? (home.data?.alerts ?? []).filter((item: any) => item.resident_id === selectedResident.id) : home.data?.alerts ?? [];
  const deviceSources = new Set(observations.map((item: any) => item.source).filter(Boolean));

  const resolveAlert = async (alertId: string) => {
    const { error } = await (supabase as any)
      .from("alerts")
      .update({ status: "resolved", resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    if (error) return toast.error(error.message);
    toast.success("Home alert resolved");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  const addObservation = async () => {
    const tenantId = profile?.tenant_id ?? selectedResident?.tenant_id;
    if (!tenantId || !selectedResident || !draft.metric.trim()) return;
    const { error } = await supabase.from("twin_observations").insert({
      tenant_id: tenantId,
      resident_id: selectedResident.id,
      created_by: user?.id ?? null,
      domain: draft.domain,
      metric: draft.metric.trim(),
      value_text: draft.value_text.trim() || null,
      source: "manual_home_entry",
      notes: draft.notes.trim() || null,
    });
    if (error) return toast.error(error.message);
    setDraft({ metric: "", value_text: "", domain: "environment", notes: "" });
    toast.success("Home observation saved");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  return (
    <>
      <PageHeader
        title="Home guardianship"
        subtitle="Smart-home view from real twin observations, manual home signals and safety alerts."
        action={<Pill tone={home.isError ? "wine" : "olive"}>{home.isError ? "Read error" : "Live observations"}</Pill>}
      />

      {home.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading home records...</p>
      ) : home.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load smart-home records.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(home.error as Error).message}</p>
        </Card>
      ) : !selectedResident ? (
        <EmptyState title="No residents yet" hint="Create a resident before adding home observations." />
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Resident</p>
                <h2 className="text-2xl font-semibold text-foreground">{selectedResident.preferred_name || selectedResident.full_name}</h2>
              </div>
              <select value={selectedResident.id} onChange={(event) => setResidentId(event.target.value)} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm">
                {(home.data?.residents ?? []).map((resident: any) => (
                  <option key={resident.id} value={resident.id}>{resident.preferred_name || resident.full_name}</option>
                ))}
              </select>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Observations" value={observations.length} sub="Twin observations" tone="olive" />
            <Stat label="Sources" value={deviceSources.size} sub="Distinct sources" tone="moss" />
            <Stat label="Safety alerts" value={alerts.length} sub="Home/safety category" tone="wine" />
            <Stat label="Residents" value={home.data?.residents.length ?? 0} sub="Tenant scope" tone="gold" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-xl font-semibold text-foreground">Connected signal sources</h2>
              {deviceSources.size === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No device signal yet"
                    hint="Connect a smart-home provider or add manual observations to create real source records."
                  />
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(deviceSources).map((source) => (
                    <Pill key={source} tone="moss">{source}</Pill>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h2 className="text-xl font-semibold text-foreground">Home safety alerts</h2>
              {alerts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No home alerts" hint="Safety alerts from Alert center appear here." />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {alerts.slice(0, 6).map((alert: any) => (
                    <div key={alert.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.category} - {new Date(alert.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill tone={alert.severity === "critical" ? "wine" : "gold"}>{alert.status}</Pill>
                          {alert.status !== "resolved" && (
                            <button onClick={() => resolveAlert(alert.id)} className="rounded-full border border-border px-3 py-1 text-xs">
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <Card>
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-olive" />
                <h2 className="text-xl font-semibold text-foreground">Home observations</h2>
              </div>
              {observations.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="No home observations" hint="Add observations manually or connect devices later." />
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {observations.slice(0, 12).map((item: any) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{item.metric}</p>
                        <Pill tone="olive">{item.domain}</Pill>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.value_numeric ?? item.value_text ?? "-"} {item.unit ?? ""}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.source} - {new Date(item.observed_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-olive" />
                <h2 className="text-xl font-semibold text-foreground">Add observation</h2>
              </div>
              <div className="mt-4 space-y-3">
                <input value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })} placeholder="Metric, e.g. front door" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <input value={draft.value_text} onChange={(event) => setDraft({ ...draft, value_text: event.target.value })} placeholder="Value, e.g. locked" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <select value={draft.domain} onChange={(event) => setDraft({ ...draft, domain: event.target.value })} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm">
                  <option value="environment">environment</option>
                  <option value="safety">safety</option>
                  <option value="movement">movement</option>
                  <option value="sleep">sleep</option>
                </select>
                <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Notes" rows={3} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <button onClick={addObservation} className="w-full rounded-xl bg-olive px-4 py-2 text-sm text-ivory">Save observation</button>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
