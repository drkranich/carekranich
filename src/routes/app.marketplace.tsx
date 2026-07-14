import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/marketplace")({
  component: Marketplace,
});

const categories = [
  { value: "all", label: "Todos" },
  { value: "service_provider", label: "Prestador de servicos" },
  { value: "staff", label: "Funcionario" },
  { value: "clinic", label: "Clinica" },
  { value: "family", label: "Familia" },
];

const categoryLabel = (value: string) =>
  categories.find((item) => item.value === value)?.label ?? value.replaceAll("_", " ");

function Marketplace() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const [category, setCategory] = useState("all");

  const marketplace = useQuery({
    queryKey: ["marketplace-profiles"],
    queryFn: async () => {
      const db = supabase as any;
      const [profiles, identities] = await Promise.all([
        db.from("profiles").select("id,full_name,avatar_url,user_kind,account_status,verification_status,tenant_id,created_at").order("created_at", { ascending: false }).limit(300),
        db.from("identity_verifications").select("user_id,status,subject_type,provider,reviewed_at").order("created_at", { ascending: false }).limit(300),
      ]);
      const errors = [profiles, identities].map((item) => item.error?.message).filter(Boolean);
      if (errors.length) throw new Error(errors.join(" | "));
      return { profiles: profiles.data ?? [], identities: identities.data ?? [] };
    },
  });

  const providers = useMemo(() => {
    const identityMap = new Map<string, string>();
    (marketplace.data?.identities ?? []).forEach((item: any) => {
      if (!identityMap.has(item.user_id)) identityMap.set(item.user_id, item.status);
    });
    return (marketplace.data?.profiles ?? [])
      .filter((item: any) => ["service_provider", "staff", "clinic"].includes(item.user_kind) || item.verification_status === "verified")
      .map((item: any) => ({ ...item, identity_status: identityMap.get(item.id) ?? item.verification_status ?? "not_started" }))
      .filter((item: any) => category === "all" || item.user_kind === category);
  }, [category, marketplace.data]);

  const contactProvider = async (provider: any) => {
    if (!user) return;
    const subject = `Marketplace contact: ${provider.full_name ?? provider.id}`;
    const { data: thread, error: threadError } = await (supabase as any)
      .from("inbox_threads")
      .insert({
        tenant_id: profile?.tenant_id ?? provider.tenant_id ?? null,
        subject,
        source: "marketplace",
        status: "open",
        priority: "normal",
        created_by: user.id,
        participant_user_id: provider.id,
      })
      .select("id")
      .single();
    if (threadError) return toast.error(threadError.message);
    const { error: messageError } = await (supabase as any).from("inbox_messages").insert({
      thread_id: thread.id,
      sender_id: user.id,
      sender_label: "Marketplace",
      body: "I would like to discuss services through Care Kranich.",
      channel: "in_app",
    });
    if (messageError) return toast.error(messageError.message);
    toast.success("Inbox thread created");
    qc.invalidateQueries({ queryKey: ["inbox-threads"] });
  };

  return (
    <>
      <PageHeader
        title="Care marketplace"
        subtitle="Verified providers and organizations from approved profiles, ready for service catalog expansion."
        action={<Pill tone={marketplace.isError ? "wine" : "olive"}>{marketplace.isError ? "Read error" : `${providers.length} profiles`}</Pill>}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item.value}
            onClick={() => setCategory(item.value)}
            className={`rounded-full px-4 py-2 text-xs ${category === item.value ? "bg-olive text-ivory" : "border border-border bg-white/50 text-muted-foreground"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {marketplace.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading marketplace profiles...</p>
      ) : marketplace.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not load marketplace.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(marketplace.error as Error).message}</p>
        </Card>
      ) : providers.length === 0 ? (
        <EmptyState title="No marketplace providers yet" hint="Approved service providers with verified identity will appear here." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider: any) => (
            <Card key={provider.id}>
              <div className="flex items-start gap-4">
                <Avatar name={provider.full_name ?? provider.id} src={provider.avatar_url} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-foreground">{provider.full_name ?? provider.id}</p>
                  <p className="text-xs text-muted-foreground">{categoryLabel(provider.user_kind)} - {provider.account_status}</p>
                </div>
                <Pill tone={provider.identity_status === "verified" ? "moss" : "gold"}>{provider.identity_status}</Pill>
              </div>
              <div className="mt-5 rounded-2xl border border-border/60 bg-cream/40 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BadgeCheck className="h-4 w-4 text-olive" />
                  Verified ratings and service catalogs require provider listing records.
                </div>
              </div>
              <button onClick={() => contactProvider(provider)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-xs text-ivory">
                <MessageCircle className="h-3.5 w-3.5" />
                Contact in inbox
              </button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
