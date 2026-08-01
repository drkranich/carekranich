import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
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
    toast.success("Alerta residencial resolvido");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  const addObservation = async () => {
    const tenantId = profile?.tenant_id ?? selectedResident?.tenant_id;
    if (!tenantId || !selectedResident || !draft.metric.trim()) {
      toast.error("Informe a métrica e selecione um residente.");
      return;
    }
    const { error } = await supabase.from("twin_observations").insert({
      tenant_id: tenantId,
      resident_id: selectedResident.id,
      created_by: user?.id ?? null,
      domain: draft.domain,
      metric: draft.metric.trim(),
      value_text: draft.value_text.trim() || null,
      source: "manual_home_entry",
      notes: draft.notes.trim() || null,
    } as any);
    if (error) return toast.error(error.message);
    setDraft({ metric: "", value_text: "", domain: "environment", notes: "" });
    toast.success("Observação residencial salva");
    qc.invalidateQueries({ queryKey: ["smart-home-real"] });
  };

  return (
    <>
      <PageHeader
        title="Guardião do lar"
        subtitle="Visão da casa inteligente com observações reais, sinais manuais e alertas de segurança."
        action={<Pill tone={home.isError ? "wine" : "olive"}>{home.isError ? "Erro de leitura" : "Observações ao vivo"}</Pill>}
      />

      {home.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando registros da casa...</p>
      ) : home.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Não foi possível carregar os registros da casa.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(home.error as Error).message}</p>
        </Card>
      ) : !selectedResident ? (
        <EmptyState title="Nenhum residente ainda" hint="Cadastre um residente antes de adicionar observações da casa." />
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Residente</p>
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
            <Stat label="Observações" value={observations.length} sub="Observações do gêmeo digital" tone="olive" />
            <Stat label="Fontes" value={deviceSources.size} sub="Fontes distintas" tone="moss" />
            <Stat label="Alertas de segurança" value={alerts.length} sub="Categoria casa/segurança" tone="wine" />
            <Stat label="Residentes" value={home.data?.residents.length ?? 0} sub="Na organização" tone="gold" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-xl font-semibold text-foreground">Fontes de sinal conectadas</h2>
              {deviceSources.size === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="Nenhum sinal de dispositivo ainda"
                    hint="Conecte um provedor de casa inteligente ou adicione observações manuais para criar registros reais."
                  />
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(deviceSources).map((source) => (
                    <Pill key={source} tone="moss">{source === "manual_home_entry" ? "registro manual" : source}</Pill>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h2 className="text-xl font-semibold text-foreground">Alertas de segurança do lar</h2>
              {alerts.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="Nenhum alerta residencial" hint="Alertas de segurança da Central de alertas aparecem aqui." />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {alerts.slice(0, 6).map((alert: any) => (
                    <div key={alert.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.category} · {new Date(alert.created_at).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill tone={alert.severity === "critical" ? "wine" : "gold"}>{alert.status === "open" ? "aberto" : alert.status}</Pill>
                          {alert.status !== "resolved" && (
                            <button onClick={() => resolveAlert(alert.id)} className="rounded-full border border-border px-3 py-1 text-xs">
                              Resolver
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
                <h2 className="text-xl font-semibold text-foreground">Observações da casa</h2>
              </div>
              {observations.length === 0 ? (
                <div className="mt-5">
                  <EmptyState title="Nenhuma observação da casa" hint="Adicione observações manualmente ou conecte dispositivos depois." />
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
                      <p className="mt-1 text-xs text-muted-foreground">{item.source === "manual_home_entry" ? "registro manual" : item.source} · {new Date(item.observed_at).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-olive" />
                <h2 className="text-xl font-semibold text-foreground">Adicionar observação</h2>
              </div>
              <div className="mt-4 space-y-3">
                <input value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })} placeholder="Métrica, ex.: porta da frente" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <input value={draft.value_text} onChange={(event) => setDraft({ ...draft, value_text: event.target.value })} placeholder="Valor, ex.: trancada" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <GlassSelect
                  value={draft.domain}
                  onChange={(value) => setDraft({ ...draft, domain: value })}
                  options={[
                    { value: "environment", label: "Ambiente" },
                    { value: "safety", label: "Segurança" },
                    { value: "movement", label: "Movimento" },
                    { value: "sleep", label: "Sono" },
                  ]}
                />
                <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Observações" rows={3} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                <button onClick={addObservation} className="w-full rounded-xl bg-olive px-4 py-2 text-sm text-ivory">Salvar observação</button>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
