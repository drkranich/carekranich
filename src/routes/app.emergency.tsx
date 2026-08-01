import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, Pencil, Share2, Siren, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/emergency")({
  component: Emergency,
});

function Emergency() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, isAdmin } = useAuth();
  const [residentId, setResidentId] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", description: "" });
  const [delegatingId, setDelegatingId] = useState<string | null>(null);
  const [delegateTo, setDelegateTo] = useState("");

  const canManage = isAdmin || isSuperAdmin;

  const data = useQuery({
    queryKey: ["emergency-center", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [residents, alerts, locations, members] = await Promise.all([
        db.from("residents").select("id,tenant_id,full_name,preferred_name").order("full_name").limit(200),
        db.from("alerts").select("id,resident_id,title,description,severity,status,created_at,resolved_at,assigned_to,archived_at").order("created_at", { ascending: false }).limit(100),
        db.from("address_locations").select("id,entity_id,address,city,state,country,latitude,longitude").eq("entity_type", "resident").limit(200),
        db.from("profiles").select("id,full_name,preferred_name").limit(300),
      ]);
      const errors = [residents, alerts, locations, members].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return {
        residents: residents.data ?? [],
        alerts: alerts.data ?? [],
        locations: locations.data ?? [],
        members: members.data ?? [],
      };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["emergency-center"] });

  const memberName = (id: string | null) => {
    const m = (data.data?.members ?? []).find((x: any) => x.id === id);
    return m ? m.preferred_name || m.full_name || "Funcionário" : null;
  };

  const activeEmergencies = (data.data?.alerts ?? []).filter(
    (alert: any) =>
      !alert.archived_at &&
      !["resolved", "closed"].includes(alert.status) &&
      ["critical", "emergency", "high"].includes(alert.severity),
  );
  const archivedEmergencies = (data.data?.alerts ?? []).filter((alert: any) => alert.archived_at);

  const createSOS = async () => {
    if (!user) return;
    const selectedResident = (data.data?.residents ?? []).find((resident: any) => resident.id === residentId);
    const tenantId = profile?.tenant_id ?? selectedResident?.tenant_id;
    if (!tenantId) return toast.error("Selecione um residente com organização antes de criar o SOS.");
    setSending(true);
    try {
      const { error } = await (supabase as any).from("alerts").insert({
        tenant_id: tenantId,
        resident_id: residentId || null,
        created_by: user.id,
        title: "Acionamento de emergência SOS",
        description: description.trim() || "SOS manual acionado pela central de emergência.",
        severity: "critical",
        category: "emergency",
        status: "open",
      });
      if (error) throw error;
      toast.success("Alerta SOS criado");
      setDescription("");
      refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível criar o alerta SOS");
    } finally {
      setSending(false);
    }
  };

  const updateAlert = async (id: string, patch: Record<string, unknown>, message: string) => {
    const { error } = await (supabase as any).from("alerts").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(message);
    setEditingId(null);
    setDelegatingId(null);
    setDelegateTo("");
    refresh();
  };

  const deleteAlert = async (id: string) => {
    if (!window.confirm("Excluir este alerta definitivamente?")) return;
    const { data: deleted, error } = await (supabase as any).from("alerts").delete().eq("id", id).select("id").maybeSingle();
    if (error) return toast.error(error.message);
    if (!deleted) return toast.error("Alerta não foi excluído. Verifique suas permissões.");
    toast.success("Alerta excluído");
    refresh();
  };

  const shareAlert = async (alert: any) => {
    const text = [
      `Alerta de emergência: ${alert.title}`,
      `Status: ${statusLabel(alert.status)}`,
      `Descrição: ${alert.description ?? "Sem descrição."}`,
      `Criado em: ${new Date(alert.created_at).toLocaleString("pt-BR")}`,
      `${window.location.origin}/app/emergency?alert=${alert.id}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Alerta copiado para compartilhamento");
    } catch {
      window.prompt("Copie o alerta:", text);
    }
  };

  const statusLabel = (status: string) =>
    ({ open: "aberto", acknowledged: "reconhecido", resolved: "resolvido", closed: "encerrado" }[status] ?? status);

  return (
    <>
      <PageHeader
        title="Central de emergência"
        subtitle="Cria e acompanha alertas críticos reais. Disparo por telefone e SMS será conectado na fase de integrações."
        action={<Pill tone={activeEmergencies.length ? "wine" : "moss"}>{activeEmergencies.length} ativo(s)</Pill>}
      />

      {data.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando registros de emergência...</p>
      ) : data.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Não foi possível carregar a central de emergência.</p>
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
                <h2 className="text-2xl font-semibold text-foreground">Criar alerta SOS</h2>
                <p className="text-sm text-muted-foreground">Registra um alerta crítico imediatamente.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GlassSelect
                value={residentId}
                onChange={setResidentId}
                options={[
                  { value: "", label: "Nenhum residente selecionado" },
                  ...(data.data?.residents ?? []).map((resident: any) => ({
                    value: resident.id,
                    label: resident.preferred_name || resident.full_name,
                  })),
                ]}
              />
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="O que aconteceu?" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <button onClick={createSOS} disabled={sending || (!profile?.tenant_id && !residentId)} className="w-full rounded-2xl bg-wine px-4 py-3 text-sm font-semibold text-ivory disabled:opacity-50">
                {sending ? "Criando..." : "Criar alerta crítico"}
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-wine" />
              <h2 className="text-xl font-semibold text-foreground">Alertas de emergência ativos</h2>
            </div>
            {activeEmergencies.length === 0 ? (
              <div className="mt-5">
                <EmptyState title="Nenhuma emergência ativa" hint="Alertas críticos criados aqui ou na Central de alertas aparecem nesta lista." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {activeEmergencies.map((alert: any) => (
                  <div key={alert.id} className="rounded-2xl border border-wine/20 bg-wine/5 p-4">
                    {editingId === alert.id ? (
                      <div className="space-y-2">
                        <input
                          value={editDraft.title}
                          onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
                          className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                        />
                        <textarea
                          value={editDraft.description}
                          onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                          rows={3}
                          className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              updateAlert(alert.id, { title: editDraft.title.trim(), description: editDraft.description.trim() || null }, "Alerta atualizado")
                            }
                            className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory"
                          >
                            Salvar
                          </button>
                          <button onClick={() => setEditingId(null)} className="rounded-full border border-border px-4 py-1.5 text-xs">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-foreground">{alert.title}</p>
                          <Pill tone="wine">{statusLabel(alert.status)}</Pill>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{alert.description ?? "Sem descrição."}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString("pt-BR")}
                          {alert.assigned_to && memberName(alert.assigned_to) ? ` · delegado a ${memberName(alert.assigned_to)}` : ""}
                        </p>

                        {delegatingId === alert.id ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <GlassSelect
                              value={delegateTo}
                              onChange={setDelegateTo}
                              placeholder="Escolher funcionário"
                              className="min-w-56"
                              options={(data.data?.members ?? []).map((m: any) => ({
                                value: m.id,
                                label: m.preferred_name || m.full_name || "Funcionário",
                              }))}
                            />
                            <button
                              onClick={() => {
                                if (!delegateTo) return toast.error("Escolha o funcionário responsável.");
                                updateAlert(alert.id, { assigned_to: delegateTo, status: "acknowledged" }, "Alerta delegado");
                              }}
                              className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory"
                            >
                              Delegar
                            </button>
                            <button onClick={() => setDelegatingId(null)} className="rounded-full border border-border px-4 py-1.5 text-xs">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <button
                              onClick={() => updateAlert(alert.id, { status: "resolved", resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() }, "Alerta resolvido")}
                              className="rounded-full bg-olive px-3 py-1.5 font-medium text-ivory"
                            >
                              Resolver
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(alert.id);
                                setEditDraft({ title: alert.title ?? "", description: alert.description ?? "" });
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5"
                            >
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button
                              onClick={() => {
                                setDelegatingId(alert.id);
                                setDelegateTo(alert.assigned_to ?? "");
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5"
                            >
                              <UserCheck className="h-3 w-3" /> Delegar
                            </button>
                            <button
                              onClick={() => shareAlert(alert)}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5"
                            >
                              <Share2 className="h-3 w-3" /> Compartilhar
                            </button>
                            <button
                              onClick={() => updateAlert(alert.id, { archived_at: new Date().toISOString() }, "Alerta arquivado")}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5"
                            >
                              <Archive className="h-3 w-3" /> Arquivar
                            </button>
                            {canManage && (
                              <button
                                onClick={() => deleteAlert(alert.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-wine/30 bg-wine/5 px-3 py-1.5 text-wine"
                              >
                                <Trash2 className="h-3 w-3" /> Excluir
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {archivedEmergencies.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-foreground">Arquivados</h3>
                <div className="mt-2 space-y-2">
                  {archivedEmergencies.slice(0, 6).map((alert: any) => (
                    <div key={alert.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-cream/40 px-4 py-2.5 text-xs text-muted-foreground">
                      <span>{alert.title} · {new Date(alert.created_at).toLocaleDateString("pt-BR")}</span>
                      <span className="flex gap-2">
                        <button onClick={() => updateAlert(alert.id, { archived_at: null }, "Alerta restaurado")} className="hover:underline">
                          Restaurar
                        </button>
                        {canManage && (
                          <button onClick={() => deleteAlert(alert.id)} className="text-wine hover:underline">
                            Excluir
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground">Endereços de emergência dos residentes</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(data.data?.locations ?? []).map((location: any) => (
                <div key={location.id} className="rounded-2xl border border-border/60 bg-cream/40 p-4">
                  <p className="text-sm font-medium text-foreground">{location.address}</p>
                  <p className="text-xs text-muted-foreground">{[location.city, location.state, location.country].filter(Boolean).join(", ")}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {location.latitude && location.longitude ? `${location.latitude}, ${location.longitude}` : "Sem coordenadas GPS"}
                  </p>
                </div>
              ))}
              {(data.data?.locations ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum endereço de residente salvo.</p>}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
