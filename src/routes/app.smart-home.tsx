import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Home, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/smart-home")({
  component: SmartHome,
});

const HOME_DOMAIN_OPTIONS = [
  { value: "environment", label: "Environment" },
  { value: "routine", label: "Routine" },
  { value: "mobility", label: "Movement" },
  { value: "sleep", label: "Sleep" },
];

function SmartHome() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [residentId, setResidentId] = useState("");
  const [draft, setDraft] = useState({ metric: "", value_text: "", domain: "environment", notes: "" });
  const [editingObservationId, setEditingObservationId] = useState<string | null>(null);
  const [editObservationDraft, setEditObservationDraft] = useState({ metric: "", value_text: "", domain: "environment", notes: "" });

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
  const observations = selectedResident
    ? (home.data?.observations ?? []).filter((item: any) => item.resident_id === selectedResident.id && !isArchivedObservation(item))
    : [];
  const alerts = selectedResident ? (home.data?.alerts ?? []).filter((item: any) => item.resident_id === selectedResident.id) : home.data?.alerts ?? [];
  const deviceSources = new Set(observations.map((item: any) => item.source).filter(Boolean));

  const resolveAlert = async (alertId: string) => {
    const { data, error } = await (supabase as any)
      .from("alerts")
      .update({ status: "resolved", resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() })
      .eq("id", alertId)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Alert was not resolved. Check your permissions.");
    toast.success("Home alert resolved");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  const addObservation = async () => {
    const tenantId = profile?.tenant_id ?? selectedResident?.tenant_id;
    if (!tenantId || !selectedResident || !draft.metric.trim()) {
      toast.error("Enter the metric and select a resident.");
      return;
    }
    const { error } = await supabase.from("twin_observations").insert({
      tenant_id: tenantId,
      resident_id: selectedResident.id,
      created_by: user?.id ?? null,
      domain: draft.domain,
      metric: draft.metric.trim(),
      value_text: draft.value_text.trim() || null,
      source: "manual",
      notes: draft.notes.trim() || null,
    } as any);
    if (error) return toast.error(error.message);
    setDraft({ metric: "", value_text: "", domain: "environment", notes: "" });
    toast.success("Home observation saved");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  const startEditObservation = (item: any) => {
    setEditingObservationId(item.id);
    setEditObservationDraft({
      metric: item.metric ?? "",
      value_text: String(item.value_numeric ?? item.value_text ?? ""),
      domain: item.domain ?? "environment",
      notes: stripArchiveMarker(item.notes ?? ""),
    });
  };

  const saveObservationEdit = async (item: any) => {
    if (!editObservationDraft.metric.trim()) return toast.error("Enter the observation metric.");
    const { data, error } = await (supabase as any)
      .from("twin_observations")
      .update({
        metric: editObservationDraft.metric.trim(),
        value_text: editObservationDraft.value_text.trim() || null,
        value_numeric: null,
        domain: editObservationDraft.domain,
        notes: editObservationDraft.notes.trim() || null,
      })
      .eq("id", item.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Observation was not updated. Check your permissions.");
    toast.success("Observation updated");
    setEditingObservationId(null);
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  const archiveObservation = async (item: any) => {
    const cleanNotes = stripArchiveMarker(item.notes ?? "").trim();
    const notes = [cleanNotes, `[archived ${new Date().toISOString()}]`].filter(Boolean).join("\n");
    const { data, error } = await (supabase as any)
      .from("twin_observations")
      .update({ notes })
      .eq("id", item.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Observation was not archived. Check your permissions.");
    toast.success("Observation archived");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  const shareObservation = async (item: any) => {
    const value = [item.value_numeric ?? item.value_text ?? "-", item.unit ?? ""].filter(Boolean).join(" ");
    const text = [
      `Home observation: ${item.metric}`,
      `Value: ${value}`,
      `Domain: ${item.domain}`,
      `Recorded at: ${new Date(item.observed_at).toLocaleString("en-US")}`,
      `${window.location.origin}/app/smart-home?observation=${item.id}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Observation copied for sharing");
    } catch {
      window.prompt("Copy the observation:", text);
    }
  };

  const deleteObservation = async (item: any) => {
    if (!window.confirm(`Permanently delete observation "${item.metric}"?`)) return;
    const { data, error } = await (supabase as any)
      .from("twin_observations")
      .delete()
      .eq("id", item.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Observation was not deleted. Check your permissions.");
    toast.success("Observation deleted");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  return (
    <>
      <PageHeader
        title="Home guardian"
        subtitle="Smart home view with real observations, manual signals and security alerts."
        action={<Pill tone={home.isError ? "wine" : "olive"}>{home.isError ? "Read error" : "Live observations"}</Pill>}
      />

      {home.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading home records...</p>
      ) : home.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load home records.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(home.error as Error).message}</p>
        </Card>
      ) : !selectedResident ? (
        <EmptyState title="No residents yet" hint="Register a resident before adding home observations." />
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Resident</p>
                <h2 className="text-2xl font-semibold text-foreground">{selectedResident.preferred_name || selectedResident.full_name}</h2>
              </div>
              <GlassSelect
                value={selectedResident.id}
                onChange={setResidentId}
                className="w-64"
                options={(home.data?.residents ?? []).map((resident: any) => ({
                  value: resident.id,
                  label: resident.preferred_name || resident.full_name,
                }))}
              />
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Observations" value={observations.length} sub="Digital twin observations" tone="olive" />
            <Stat label="Sources" value={deviceSources.size} sub="Distinct sources" tone="moss" />
            <Stat label="Security alerts" value={alerts.length} sub="Home/security category" tone="wine" />
            <Stat label="Residents" value={home.data?.residents.length ?? 0} sub="In the organization" tone="gold" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-xl font-semibold text-foreground">Connected signal sources</h2>
              {deviceSources.size === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No device signal yet"
                    hint="Connect a smart home provider or add manual observations to create real records."
                  />
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(deviceSources).map((source) => (
                    <Pill key={source} tone="moss">{sourceLabel(String(source))}</Pill>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h2 className="text-xl font-semibold text-foreground">Home security alerts</h2>
              {alerts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No home alert" hint="Security alerts from the Alert center appear here." />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {alerts.slice(0, 6).map((alert: any) => (
                    <div key={alert.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.category} - {new Date(alert.created_at).toLocaleString("en-US")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill tone={alert.severity === "critical" ? "wine" : "gold"}>{alert.status === "open" ? "open" : alert.status}</Pill>
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
                  <EmptyState title="No home observation" hint="Add observations manually or connect devices later." />
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {observations.slice(0, 12).map((item: any) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                      {editingObservationId === item.id ? (
                        <div className="space-y-2">
                          <input
                            value={editObservationDraft.metric}
                            onChange={(event) => setEditObservationDraft({ ...editObservationDraft, metric: event.target.value })}
                            className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                          />
                          <input
                            value={editObservationDraft.value_text}
                            onChange={(event) => setEditObservationDraft({ ...editObservationDraft, value_text: event.target.value })}
                            className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                          />
                          <GlassSelect
                            value={editObservationDraft.domain}
                            onChange={(value) => setEditObservationDraft({ ...editObservationDraft, domain: value })}
                            options={HOME_DOMAIN_OPTIONS}
                          />
                          <textarea
                            value={editObservationDraft.notes}
                            onChange={(event) => setEditObservationDraft({ ...editObservationDraft, notes: event.target.value })}
                            rows={3}
                            className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => saveObservationEdit(item)} className="rounded-full bg-olive px-3 py-1.5 text-xs font-medium text-ivory">
                              Save
                            </button>
                            <button onClick={() => setEditingObservationId(null)} className="rounded-full border border-border px-3 py-1.5 text-xs">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">{item.metric}</p>
                            <Pill tone="olive">{HOME_DOMAIN_OPTIONS.find((option) => option.value === item.domain)?.label ?? item.domain}</Pill>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{item.value_numeric ?? item.value_text ?? "-"} {item.unit ?? ""}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{sourceLabel(item.source)} - {new Date(item.observed_at).toLocaleString("en-US")}</p>
                          {stripArchiveMarker(item.notes ?? "").trim() && (
                            <p className="mt-2 rounded-xl border border-border/60 bg-white/45 p-3 text-xs text-muted-foreground">{stripArchiveMarker(item.notes ?? "")}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <button onClick={() => startEditObservation(item)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5">
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button onClick={() => shareObservation(item)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5">
                              <Share2 className="h-3 w-3" /> Share
                            </button>
                            <button onClick={() => archiveObservation(item)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5">
                              <Archive className="h-3 w-3" /> Archive
                            </button>
                            <button onClick={() => deleteObservation(item)} className="inline-flex items-center gap-1 rounded-full border border-wine/30 bg-wine/5 px-3 py-1.5 text-wine">
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </>
                      )}
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
                <GlassSelect
                  value={draft.domain}
                  onChange={(value) => setDraft({ ...draft, domain: value })}
                  options={HOME_DOMAIN_OPTIONS}
                />
                <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Observations" rows={3} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <button onClick={addObservation} className="w-full rounded-xl bg-olive px-4 py-2 text-sm text-ivory">Save observation</button>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function isArchivedObservation(item: any) {
  return typeof item.notes === "string" && item.notes.includes("[archived ");
}

function stripArchiveMarker(notes: string) {
  return notes.replace(/\n?\[archived [^\]]+\]/g, "");
}

function sourceLabel(source: string | null) {
  if (source === "manual" || source === "manual_home_entry") return "manual record";
  if (source === "device") return "device";
  if (source === "family") return "family";
  return source ?? "source not informed";
}
