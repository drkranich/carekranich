import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, Expand, MailPlus, Pencil, Share2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDateTimePicker } from "@/components/app/GlassDatePicker";
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

type EmailBlock = {
  id: string;
  type: "heading" | "text" | "image" | "button" | "divider" | "spacer" | "symbols";
  text?: string;
  url?: string;
  height?: number;
  size?: number;
};

type Design = {
  headline: string;
  paragraphs: string;
  cta_text: string;
  cta_url: string;
  footer: string;
  blocks?: EmailBlock[];
};

const EMPTY_DESIGN: Design = { headline: "", paragraphs: "", cta_text: "", cta_url: "", footer: "Care Kranich · cuidado que acompanha a vida", blocks: [] };

const SYMBOL_SETS = ["✦ ✦ ✦", "❦", "🌿 🌿 🌿", "♥", "★ ★ ★", "— ◆ —", "🕊️", "☀️ 🌙 ⭐"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function renderBlock(block: EmailBlock) {
  switch (block.type) {
    case "heading":
      return `<h2 style="margin:24px 0 12px;font-size:21px;line-height:1.35;color:#2f3428;">${escapeHtml(block.text ?? "")}</h2>`;
    case "text":
      return (block.text ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3f4437;">${escapeHtml(line)}</p>`)
        .join("");
    case "image":
      return block.url
        ? `<img src="${block.url}" alt="" style="width:100%;max-height:${block.height ?? 240}px;object-fit:cover;display:block;border-radius:14px;margin:10px 0 18px;" />`
        : "";
    case "button":
      return block.text && block.url
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px auto 22px;"><tr><td style="background:#5a6b46;border-radius:999px;"><a href="${block.url}" style="display:inline-block;padding:12px 32px;color:#faf7ef;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(block.text)}</a></td></tr></table>`
        : "";
    case "divider":
      return `<hr style="border:none;border-top:1px solid #e7e2d2;margin:22px 0;" />`;
    case "spacer":
      return `<div style="height:${block.height ?? 24}px;line-height:${block.height ?? 24}px;">&nbsp;</div>`;
    case "symbols":
      return `<p style="margin:14px 0;text-align:center;font-size:${block.size ?? 20}px;color:#5a6b46;letter-spacing:6px;">${escapeHtml(block.text ?? "✦ ✦ ✦")}</p>`;
    default:
      return "";
  }
}
const EMPTY_TEMPLATE = { name: "", subject: "", image_url: "", preview: "" };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmailHtml(template: typeof EMPTY_TEMPLATE, design: Design) {
  const paragraphs = design.paragraphs
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3f4437;">${escapeHtml(line)}</p>`)
    .join("");
  const image = template.image_url
    ? `<img src="${template.image_url}" alt="" style="width:100%;max-height:260px;object-fit:cover;display:block;" />`
    : "";
  const cta = design.cta_text && design.cta_url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 24px;"><tr><td style="background:#5a6b46;border-radius:999px;"><a href="${design.cta_url}" style="display:inline-block;padding:13px 34px;color:#faf7ef;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(design.cta_text)}</a></td></tr></table>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2efe6;font-family:Georgia,'Times New Roman',serif;">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(template.preview || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe6;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fffdf8;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(90,107,70,.14);">
<tr><td style="background:#5a6b46;padding:18px 32px;"><span style="color:#faf7ef;font-size:18px;letter-spacing:.5px;">Care Kranich</span></td></tr>
${image ? `<tr><td>${image}</td></tr>` : ""}
<tr><td style="padding:36px 40px 8px;">
<h1 style="margin:0 0 18px;font-size:26px;line-height:1.3;color:#2f3428;">${escapeHtml(design.headline || template.subject)}</h1>
${paragraphs}
${(design.blocks ?? []).map(renderBlock).join("")}
</td></tr>
<tr><td align="center" style="padding:0 40px;">${cta}</td></tr>
<tr><td style="padding:20px 40px 30px;border-top:1px solid #e7e2d2;">
<p style="margin:0;font-size:12px;color:#8a8f7f;line-height:1.6;">${escapeHtml(design.footer)}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

const DESIGN_MARK = "<!--CKDESIGN:";

function parseDesign(bodyHtml: string | null): Design | null {
  if (!bodyHtml || !bodyHtml.startsWith(DESIGN_MARK)) return null;
  try {
    const end = bodyHtml.indexOf("-->");
    return JSON.parse(bodyHtml.slice(DESIGN_MARK.length, end)) as Design;
  } catch {
    return null;
  }
}

function EmailMarketing() {
  const { isAdmin, isSuperAdmin, profile, user } = useAuth();
  const qc = useQueryClient();
  const [template, setTemplate] = useState(EMPTY_TEMPLATE);
  const [design, setDesign] = useState<Design>(EMPTY_DESIGN);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [fullPreview, setFullPreview] = useState<{ name: string; html: string } | null>(null);
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

  const liveHtml = buildEmailHtml(template, design);
  const canSave = template.name.trim() && template.subject.trim() && (design.headline.trim() || design.paragraphs.trim());

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const body_html = `${DESIGN_MARK}${JSON.stringify(design)}-->${buildEmailHtml(template, design)}`;
      if (editingTemplateId) {
        const { error } = await (supabase as any)
          .from("email_templates")
          .update({ ...template, body_html })
          .eq("id", editingTemplateId);
        if (error) throw error;
        return false;
      }
      const { error } = await (supabase as any).from("email_templates").insert({
        tenant_id: profile?.tenant_id,
        ...template,
        body_html,
        category: "custom",
        created_by: user?.id,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: (created) => {
      toast.success(created ? "Template criado" : "Template atualizado");
      setTemplate(EMPTY_TEMPLATE);
      setDesign(EMPTY_DESIGN);
      setEditingTemplateId(null);
      qc.invalidateQueries({ queryKey: ["email-templates", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível salvar o template"),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from("email_templates")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Template nÃ£o foi excluÃ­do. Verifique suas permissÃµes.");
    },
    onSuccess: () => {
      toast.success("Template excluído");
      qc.invalidateQueries({ queryKey: ["email-templates", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível excluir"),
  });

  const startEditTemplate = (item: any) => {
    const parsed = parseDesign(item.body_html);
    setEditingTemplateId(item.id);
    setTemplate({ name: item.name ?? "", subject: item.subject ?? "", image_url: item.image_url ?? "", preview: item.preview ?? "" });
    setDesign(
      parsed ?? {
        ...EMPTY_DESIGN,
        headline: item.subject ?? "",
        paragraphs: (item.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600),
      },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    onError: (error: any) => toast.error(error.message ?? "Não foi possível criar a campanha"),
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
          metrics: { ...(campaign.metrics ?? {}), edited_from_ui: true },
        })
        .eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha atualizada");
      setEditingCampaign(null);
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível atualizar"),
  });

  const archiveCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const archived = campaign.status === "archived";
      const { data, error } = await (supabase as any)
        .from("email_campaigns")
        .update({
          status: archived ? "draft" : "archived",
          metrics: {
            ...(campaign.metrics ?? {}),
            archived_at: archived ? null : new Date().toISOString(),
          },
        })
        .eq("id", campaign.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Campanha nÃ£o foi arquivada. Verifique suas permissÃµes.");
    },
    onSuccess: () => {
      toast.success("Campanha atualizada");
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível arquivar"),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { data, error } = await (supabase as any)
        .from("email_campaigns")
        .delete()
        .eq("id", campaign.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Campanha nÃ£o foi excluÃ­da. Verifique suas permissÃµes.");
    },
    onSuccess: () => {
      toast.success("Campanha excluída");
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível excluir"),
  });

  const shareTemplate = async (item: any) => {
    const text = [`Template: ${item.name}`, `Assunto: ${item.subject}`, item.preview ?? "", item.body_html ?? ""]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Template copiado");
    } catch {
      window.prompt("Copie o template:", text);
    }
  };

  const shareCampaign = async (item: any) => {
    const text = [
      `Campanha: ${item.name}`,
      `AudiÃªncia: ${item.audience}`,
      `Status: ${item.status}`,
      item.scheduled_at ? `Agendada: ${new Date(item.scheduled_at).toLocaleString("pt-BR")}` : "Sem agendamento",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Campanha copiada");
    } catch {
      window.prompt("Copie a campanha:", text);
    }
  };

  return (
    <>
      <PageHeader
        title="E-mail marketing"
        subtitle="Editor visual com imagem, título, parágrafos e botão — preview em tamanho real, sem escrever HTML."
        action={<Pill tone="gold">Provedor de envio na fase de APIs</Pill>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Templates" value={templates.data?.length ?? "-"} sub="Do sistema e personalizados" tone="olive" />
        <Stat label="Campanhas" value={campaigns.data?.length ?? "-"} sub="Rascunhos e envios" tone="moss" />
        <Stat label="Com imagem" value={(templates.data ?? []).filter((t: any) => t.image_url).length} sub="Templates visuais" tone="gold" />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-foreground">{editingTemplateId ? "Editar template" : "Criar template"}</h2>
          </div>
          {editingTemplateId && <Pill tone="gold">Editando</Pill>}
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={template.name} onChange={(e) => setTemplate({ ...template, name: e.target.value })} placeholder="Nome do template *" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <input value={template.subject} onChange={(e) => setTemplate({ ...template, subject: e.target.value })} placeholder="Assunto do e-mail *" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            </div>
            <input value={template.image_url} onChange={(e) => setTemplate({ ...template, image_url: e.target.value })} placeholder="URL da imagem de capa (opcional)" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={template.preview} onChange={(e) => setTemplate({ ...template, preview: e.target.value })} placeholder="Texto de pré-visualização (aparece na caixa de entrada)" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={design.headline} onChange={(e) => setDesign({ ...design, headline: e.target.value })} placeholder="Título dentro do e-mail" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <textarea value={design.paragraphs} onChange={(e) => setDesign({ ...design, paragraphs: e.target.value })} rows={6} placeholder={"Escreva o corpo do e-mail.\nCada linha vira um parágrafo."} className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <div className="grid gap-3 md:grid-cols-2">
              <input value={design.cta_text} onChange={(e) => setDesign({ ...design, cta_text: e.target.value })} placeholder="Texto do botão (opcional)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
              <input value={design.cta_url} onChange={(e) => setDesign({ ...design, cta_url: e.target.value })} placeholder="Link do botão" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            </div>
            <input value={design.footer} onChange={(e) => setDesign({ ...design, footer: e.target.value })} placeholder="Rodapé" className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />

            <BlockEditor
              blocks={design.blocks ?? []}
              onChange={(blocks) => setDesign({ ...design, blocks })}
            />

            <div className="flex gap-2">
              <button onClick={() => saveTemplate.mutate()} disabled={!canSave || saveTemplate.isPending} className="rounded-full bg-olive px-5 py-2 text-sm font-semibold text-ivory disabled:opacity-50">
                {saveTemplate.isPending ? "Salvando..." : editingTemplateId ? "Salvar alterações" : "Salvar template"}
              </button>
              {editingTemplateId && (
                <button onClick={() => { setEditingTemplateId(null); setTemplate(EMPTY_TEMPLATE); setDesign(EMPTY_DESIGN); }} className="rounded-full border border-border bg-white/55 px-4 py-2 text-sm">
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/45 p-3 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Preview ao vivo</p>
              <button onClick={() => setFullPreview({ name: template.name || "Novo template", html: liveHtml })} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-2.5 py-1 text-[11px] hover:bg-cream">
                <Expand className="h-3 w-3" /> Tela cheia
              </button>
            </div>
            <iframe title="Preview do e-mail" sandbox="" srcDoc={liveHtml} className="h-[480px] w-full rounded-xl border border-border/50 bg-white" />
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(templates.data ?? []).map((item: any) => (
          <Card key={item.id} padded={false} className="overflow-hidden border-white/80 bg-white/48 backdrop-blur-2xl">
            {item.image_url && <img src={item.image_url} alt="" className="h-44 w-full object-cover" />}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.subject}</p>
                </div>
                <Pill tone={item.is_system ? "gold" : "olive"}>{item.is_system ? "sistema" : "personalizado"}</Pill>
              </div>
              <iframe title={`${item.name} preview`} sandbox="" srcDoc={item.body_html} className="mt-4 h-48 w-full rounded-xl border border-border/60 bg-white" />
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => createCampaign.mutate(item)} disabled={createCampaign.isPending} className="inline-flex items-center gap-2 rounded-full bg-olive px-3 py-1.5 text-xs text-ivory disabled:opacity-50">
                  <MailPlus className="h-3.5 w-3.5" /> Criar campanha
                </button>
                <button onClick={() => setFullPreview({ name: item.name, html: item.body_html })} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs">
                  <Expand className="h-3.5 w-3.5" /> Corpo inteiro
                </button>
                <button onClick={() => shareTemplate(item)} className="inline-flex items-center gap-1 rounded-full border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs">
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                </button>
                {!item.is_system && (
                  <>
                    <button onClick={() => startEditTemplate(item)} className="inline-flex items-center gap-1 rounded-full border border-olive/30 bg-white/55 px-3 py-1.5 text-xs text-olive">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button onClick={() => window.confirm(`Excluir o template "${item.name}"?`) && deleteTemplate.mutate(item.id)} className="inline-flex items-center gap-1 rounded-full border border-wine/30 px-3 py-1.5 text-xs text-wine">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Campanhas</h2>
        <div className="mt-4 space-y-3">
          {(campaigns.data ?? []).map((item: any) => (
            <div key={item.id} className="rounded-2xl border border-white/70 bg-white/45 px-4 py-3">
              {editingCampaign?.id === item.id ? (
                <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto_auto]">
                  <input value={editingCampaign.name} onChange={(event) => setEditingCampaign({ ...editingCampaign, name: event.target.value })} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                  <input value={editingCampaign.audience} onChange={(event) => setEditingCampaign({ ...editingCampaign, audience: event.target.value })} className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                  <GlassSelect value={editingCampaign.status} onChange={(value) => setEditingCampaign({ ...editingCampaign, status: value })} options={campaignStatusOptions} />
                  <GlassDateTimePicker value={toDateTimeLocal(editingCampaign.scheduled_at)} onChange={(value) => setEditingCampaign({ ...editingCampaign, scheduled_at: value ? new Date(value).toISOString() : null })} />
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
                      {item.audience} - {item.scheduled_at ? `agendada para ${new Date(item.scheduled_at).toLocaleString("pt-BR")}` : "sem agendamento"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={item.status === "draft" ? "gold" : item.status === "archived" ? "muted" : "moss"}>
                      {campaignStatusOptions.find((option) => option.value === item.status)?.label ?? item.status}
                    </Pill>
                    <button onClick={() => setEditingCampaign(item)} className="inline-flex items-center gap-1 rounded-full border border-border bg-ivory px-3 py-1.5 text-xs text-olive">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button onClick={() => archiveCampaign.mutate(item)} className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-3 py-1.5 text-xs">
                      <Archive className="h-3.5 w-3.5" /> {item.status === "archived" ? "Restaurar" : "Arquivar"}
                    </button>
                    <button onClick={() => shareCampaign(item)} className="inline-flex items-center gap-1 rounded-full border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs">
                      <Share2 className="h-3.5 w-3.5" /> Compartilhar
                    </button>
                    <button onClick={() => window.confirm("Excluir esta campanha?") && deleteCampaign.mutate(item)} className="inline-flex items-center gap-1 rounded-full border border-wine/30 px-3 py-1.5 text-xs text-wine">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {campaigns.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma campanha ainda.</p>}
        </div>
      </Card>

      {fullPreview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm" onClick={() => setFullPreview(null)}>
          <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/75 bg-white/90 shadow-elevated" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
              <p className="font-semibold text-foreground">{fullPreview.name}</p>
              <button onClick={() => setFullPreview(null)} className="rounded-full bg-cream p-2 text-foreground hover:bg-border/40">
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe title="Preview completo" sandbox="" srcDoc={fullPreview.html} className="h-full w-full bg-white" />
          </div>
        </div>
      )}
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

const BLOCK_LABEL: Record<string, string> = {
  heading: "Título",
  text: "Texto",
  image: "Imagem",
  button: "Botão",
  divider: "Divisor",
  spacer: "Espaço",
  symbols: "Símbolos",
};

function BlockEditor({ blocks, onChange }: { blocks: EmailBlock[]; onChange: (blocks: EmailBlock[]) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const add = (type: EmailBlock["type"]) => {
    const base: EmailBlock = { id: uid(), type };
    if (type === "image") base.height = 240;
    if (type === "spacer") base.height = 24;
    if (type === "symbols") {
      base.text = SYMBOL_SETS[0];
      base.size = 20;
    }
    onChange([...blocks, base]);
  };

  const patch = (id: string, partial: Partial<EmailBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)));

  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));

  const move = (index: number, delta: number) => {
    const next = [...blocks];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const dropOn = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...blocks];
    const [item] = next.splice(dragIndex, 1);
    next.splice(index, 0, item);
    onChange(next);
    setDragIndex(null);
  };

  const inputCls = "w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm";

  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Blocos do e-mail — adicione, edite e arraste para reordenar
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(BLOCK_LABEL) as Array<EmailBlock["type"]>).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => add(type)}
            className="rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs hover:bg-cream"
          >
            + {BLOCK_LABEL[type]}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {blocks.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum bloco extra ainda. Os blocos aparecem no e-mail depois dos parágrafos principais.
          </p>
        )}
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(index)}
            className={`space-y-2 rounded-2xl border p-3 transition ${
              dragIndex === index ? "border-olive/60 bg-olive/10" : "border-border/70 bg-white/55"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex cursor-grab items-center gap-2 text-xs font-medium text-muted-foreground">
                <span aria-hidden>⠿</span> {BLOCK_LABEL[block.type]}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <button type="button" onClick={() => move(index, -1)} className="rounded-full border border-border px-2 py-0.5 hover:bg-cream">↑</button>
                <button type="button" onClick={() => move(index, 1)} className="rounded-full border border-border px-2 py-0.5 hover:bg-cream">↓</button>
                <button type="button" onClick={() => remove(block.id)} className="rounded-full border border-wine/30 px-2 py-0.5 text-wine hover:bg-wine/10">✕</button>
              </span>
            </div>

            {block.type === "heading" && (
              <input value={block.text ?? ""} onChange={(e) => patch(block.id, { text: e.target.value })} placeholder="Texto do título" className={inputCls} />
            )}
            {block.type === "text" && (
              <textarea value={block.text ?? ""} onChange={(e) => patch(block.id, { text: e.target.value })} rows={3} placeholder={"Texto do bloco.\nCada linha vira um parágrafo."} className={inputCls} />
            )}
            {block.type === "image" && (
              <div className="grid gap-2 md:grid-cols-[1fr_150px]">
                <input value={block.url ?? ""} onChange={(e) => patch(block.id, { url: e.target.value })} placeholder="URL da imagem" className={inputCls} />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Altura
                  <input
                    type="range"
                    min={80}
                    max={420}
                    value={block.height ?? 240}
                    onChange={(e) => patch(block.id, { height: Number(e.target.value) })}
                    className="flex-1 accent-[color:var(--olive)]"
                  />
                  {block.height ?? 240}px
                </label>
              </div>
            )}
            {block.type === "button" && (
              <div className="grid gap-2 md:grid-cols-2">
                <input value={block.text ?? ""} onChange={(e) => patch(block.id, { text: e.target.value })} placeholder="Texto do botão" className={inputCls} />
                <input value={block.url ?? ""} onChange={(e) => patch(block.id, { url: e.target.value })} placeholder="Link do botão" className={inputCls} />
              </div>
            )}
            {block.type === "spacer" && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Altura do espaço
                <input
                  type="range"
                  min={8}
                  max={96}
                  value={block.height ?? 24}
                  onChange={(e) => patch(block.id, { height: Number(e.target.value) })}
                  className="flex-1 accent-[color:var(--olive)]"
                />
                {block.height ?? 24}px
              </label>
            )}
            {block.type === "symbols" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {SYMBOL_SETS.map((set) => (
                    <button
                      key={set}
                      type="button"
                      onClick={() => patch(block.id, { text: set })}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        block.text === set ? "border-olive bg-olive text-ivory" : "border-border bg-white/55 hover:bg-cream"
                      }`}
                    >
                      {set}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_150px]">
                  <input value={block.text ?? ""} onChange={(e) => patch(block.id, { text: e.target.value })} placeholder="Ou digite símbolos/emoji" className={inputCls} />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Tamanho
                    <input
                      type="range"
                      min={12}
                      max={48}
                      value={block.size ?? 20}
                      onChange={(e) => patch(block.id, { size: Number(e.target.value) })}
                      className="flex-1 accent-[color:var(--olive)]"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
