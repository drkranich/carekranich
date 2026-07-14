import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MailPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/email-marketing")({ component: EmailMarketing });

function EmailMarketing() {
  const { isAdmin, isSuperAdmin, profile, user } = useAuth();
  const qc = useQueryClient();
  const [template, setTemplate] = useState({ name: "", subject: "", image_url: "", preview: "", body_html: "" });
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
      toast.success("Campaign draft created");
      qc.invalidateQueries({ queryKey: ["email-campaigns", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not create campaign"),
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
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/45 px-4 py-3">
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.audience} - {item.status}</p>
              </div>
              <Pill tone={item.status === "draft" ? "gold" : "moss"}>{item.status}</Pill>
            </div>
          ))}
          {campaigns.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No campaign drafts yet.</p>}
        </div>
      </Card>
    </>
  );
}
