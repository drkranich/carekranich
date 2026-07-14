import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, MailPlus, Pencil, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/email-marketing")({ component: EmailMarketing });

const campaignStatusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "ready", label: "Pronta" },
  { value: "scheduled", label: "Agendada" },
  { value: "sent", label: "Enviada" },
  { value: "archived", label: "Arquivada" },
];

function EmailMarketing() {
  const { isAdmin, isSuperAdmin, profile, user } = useAuth();
  const qc = useQueryClient();
  const [template, setTemplate] = useState({ name: "", subject: "", image_url: "", preview: "", body_html: "" });
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const templates = useQuery({
    queryKey: ["email-templates", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("email_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const campaigns = useQuery({
    queryKey: ["email-campaigns", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("email_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("email_templates").insert({
        tenant_id: profile?.tenant_id,
        ...template,
        category: "custom",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template saved");
      setTemplate({ name: "", subject: "", image_url: "", preview: "", body_html: "" });
      qc.invalidateQueries({ queryKey: ["email-templates", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not save template"),
  });

  const createCampaign = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await (supabase as any).from("email_campaigns").insert({
        tenant_id: profile?.tenant_id,
        template_id: item.id,
        name: `Campanha - ${item.name}`,
        audience: "all_users",
        status: "draft",
        metrics: { source_template: item.name, created_from_ui: true },
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rascunho de campanha criado");
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not create campaign"),
  });

  const updateCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { error } = await (supabase as any)
        .from("email_campaigns")
        .update({
          name: campaign.name,
          audience: campaign.audience,
          status: campaign.status,
          scheduled_at: campaign.scheduled_at || null,
          metrics: {
            ...(campaign.metrics ?? {}),
            edited_from_ui: true,
          },
        })
        .eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha atualizada");
      setEditingCampaign(null);
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not update campaign"),
  });

  const archiveCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { error } = await (supabase as any)
        .from("email_campaigns")
        .update({
          status: "archived",
          metrics: {
            ...(campaign.metrics ?? {}),
            archived_at: new Date().toISOString(),
          },
        })
        .eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha arquivada");
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not archive campaign"),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { error } = await (supabase as any).from("email_campaigns").delete().eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha excluida");
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not delete campaign"),
  });

  return (
    <>
      <PageHeader title="Email marketing" subtitle="Templates with images, campaign drafts and future transactional/email provider integration." action={<Pill tone="gold">Sending provider pending</Pill>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Templates" value={templates.data?.length ?? "-"} sub="System and custom" tone="olive" />
        <Stat label="Campaigns" value={campaigns.data?.length ?? "-"} sub="Drafts and sends" tone="moss" />
        <Stat label="Images" value={(templates.data ?? []).filter((t: any) => t.image_url).length} sub="Ready visual templates" tone="gold" />
      </div>
      <Card className="mt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-semibold text-foreground">Create template</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input value={template.name} onChange={(e) => setTemplate({ ...template, name: e.target.value })} placeholder="Template name" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <input value={template.subject} onChange={(e) => setTemplate({ ...template, subject: e.target.value })} placeholder="Subject" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
          <input value={template.image_url} onChange={(e) => setTemplate({ ...template, image_url: e.target.value })} placeholder="Image URL" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
        </div>
        <input value={template.preview} onChange={(e) => setTemplate({ ...template, preview: e.target.value })} placeholder="Preview text" className="mt-3 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
        <textarea value={template.body_html} onChange={(e) => setTemplate({ ...template, body_html: e.target.value })} rows={4} placeholder="<h1>Email body</h1><p>...</p>" className="mt-3 w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
        <button onClick={() => saveTemplate.mutate()} disabled={!template.name || !template.subject || !template.body_html} className="mt-3 rounded-full bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Save template</button>
      </Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(templates.data ?? []).map((item: any) => (
          <Card key={item.id} padded={false} className="overflow-hidden border-white/80 bg-white/48 backdrop-blur-2xl">
            {item.image_url && <img src={item.image_url} alt="" className="h-48 w-full object-cover" />}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.subject}</p>
                  {item.preview && <p className="mt-2 text-sm leading-6 text-foreground/70">{item.preview}</p>}
                </div>
                <Pill tone={item.is_system ? "gold" : "olive"}>{item.is_system ? "system" : "custom"}</Pill>
              </div>
              <iframe
                title={`${item.name} preview`}
                sandbox=""
                srcDoc={item.body_html}
                className="mt-4 h-36 w-full rounded-xl border border-border/60 bg-cream/50"
              />
              <button
                onClick={() => createCampaign.mutate(item)}
                disabled={createCampaign.isPending}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-olive px-3 py-1.5 text-xs text-ivory disabled:opacity-50"
              >
                <MailPlus className="h-3.5 w-3.5" />
                Criar campanha
              </button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Campaign drafts</h2>
        <div className="mt-4 space-y-3">
          {(campaigns.data ?? []).map((item: any) => (
            <div key={item.id} className="rounded-2xl border border-white/70 bg-white/45 px-4 py-3">
              {editingCampaign?.id === item.id ? (
                <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_180px_auto]">
                  <input
                    value={editingCampaign.name}
                    onChange={(event) => setEditingCampaign({ ...editingCampaign, name: event.target.value })}
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <input
                    value={editingCampaign.audience}
                    onChange={(event) => setEditingCampaign({ ...editingCampaign, audience: event.target.value })}
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <GlassSelect
                    value={editingCampaign.status}
                    onChange={(value) => setEditingCampaign({ ...editingCampaign, status: value })}
                    options={campaignStatusOptions}
                  />
                  <input
                    type="datetime-local"
                    value={toDateTimeLocal(editingCampaign.scheduled_at)}
                    onChange={(event) => setEditingCampaign({ ...editingCampaign, scheduled_at: event.target.value ? new Date(event.target.value).toISOString() : null })}
                    className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => updateCampaign.mutate(editingCampaign)} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">Salvar</button>
                    <button onClick={() => setEditingCampaign(null)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.audience} - {item.scheduled_at ? `agendada para ${new Date(item.scheduled_at).toLocaleString()}` : "sem agendamento"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={item.status === "draft" ? "gold" : item.status === "archived" ? "muted" : "moss"}>
                      {campaignStatusOptions.find((option) => option.value === item.status)?.label ?? item.status}
                    </Pill>
                    <button onClick={() => setEditingCampaign(item)} className="inline-flex items-center gap-1 rounded-full border border-border bg-ivory px-3 py-1.5 text-xs text-olive">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button onClick={() => archiveCampaign.mutate(item)} disabled={item.status === "archived"} className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-3 py-1.5 text-xs text-gold disabled:opacity-45">
                      <Archive className="h-3.5 w-3.5" />
                      Arquivar
                    </button>
                    <button onClick={() => window.confirm("Excluir esta campanha?") && deleteCampaign.mutate(item)} className="inline-flex items-center gap-1 rounded-full border border-wine/30 px-3 py-1.5 text-xs text-wine">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {campaigns.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No campaign drafts yet.</p>}
        </div>
      </Card>
    </>
  );
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
