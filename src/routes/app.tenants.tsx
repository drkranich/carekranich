import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, PageHeader, Pill, Avatar, Stat } from "@/components/app/primitives";
import { PlatformBrandLogo, usePlatformBranding, type PlatformBranding } from "@/components/PlatformBrand";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tenants")({ component: Tenants });

function Tenants() {
  const { profile, isAdmin, isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;
  const branding = usePlatformBranding();

  const tenants = useQuery({
    queryKey: ["tenant-directory", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      let query = (supabase as any)
        .from("tenants")
        .select("id,name,slug,invite_code,status,billing_status,branding,created_at")
        .order("created_at", { ascending: false });
      if (!isSuperAdmin && tenantId) query = query.eq("id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["tenant-members", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      let profilesQuery = (supabase as any)
        .from("profiles")
        .select("id,tenant_id,full_name,preferred_name,avatar_url,account_status,user_kind");
      if (!isSuperAdmin && tenantId) profilesQuery = profilesQuery.eq("tenant_id", tenantId);
      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
        await Promise.all([
          profilesQuery.order("created_at", { ascending: false }),
          (supabase as any).from("user_roles").select("user_id,tenant_id,role"),
        ]);
      if (profilesError || rolesError) throw new Error(profilesError?.message ?? rolesError?.message);
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((role: any) => {
        const arr = rolesByUser.get(role.user_id) ?? [];
        arr.push(role.role);
        rolesByUser.set(role.user_id, arr);
      });
      return (profiles ?? []).map((item: any) => ({ ...item, roles: rolesByUser.get(item.id) ?? [] }));
    },
  });

  const residents = useQuery({
    queryKey: ["tenant-residents-count", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      let query = (supabase as any).from("residents").select("id", { count: "exact", head: true });
      if (!isSuperAdmin && tenantId) query = query.eq("tenant_id", tenantId);
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const subscriptions = useQuery({
    queryKey: ["tenant-subscriptions-summary", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      let query = (supabase as any)
        .from("tenant_subscriptions")
        .select("id,tenant_id,status,access_status,stripe_price_id,current_period_end")
        .order("created_at", { ascending: false });
      if (!isSuperAdmin && tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const tenantStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      billingStatus,
      reason,
    }: {
      id: string;
      status: string;
      billingStatus?: string;
      reason?: string;
    }) => {
      const { error } = await (supabase as any).rpc("set_tenant_operational_status", {
        _tenant_id: id,
        _status: status,
        _billing_status: billingStatus ?? null,
        _reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da organização atualizado");
      qc.invalidateQueries({ queryKey: ["tenant-directory"] });
      qc.invalidateQueries({ queryKey: ["current-tenant-access"] });
      qc.invalidateQueries({ queryKey: ["super-admin-control-plane"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível atualizar a organização"),
  });

  const brandingUpdate = useMutation({
    mutationFn: async ({
      brandName,
      logoUrl,
      logoPath,
      faviconUrl,
      faviconPath,
    }: {
      brandName?: string;
      logoUrl?: string;
      logoPath?: string;
      faviconUrl?: string;
      faviconPath?: string;
    }) => {
      const { error } = await (supabase as any).rpc("set_platform_branding", {
        _brand_name: brandName ?? null,
        _logo_url: logoUrl ?? null,
        _logo_path: logoPath ?? null,
        _favicon_url: faviconUrl ?? null,
        _favicon_path: faviconPath ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marca atualizada");
      qc.invalidateQueries({ queryKey: ["platform-branding"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Nao foi possivel atualizar a marca"),
  });

  const uploadBrandAsset = useMutation({
    mutationFn: async ({ kind, file }: { kind: "logo" | "favicon"; file: File }) => {
      validateBrandAsset(kind, file);
      const extension = assetExtension(file);
      const path = `platform/${kind}-${Date.now()}.${extension}`;
      const { error: uploadError } = await (supabase as any).storage
        .from("branding")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || undefined,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = (supabase as any).storage.from("branding").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Nao foi possivel gerar a URL publica do arquivo.");

      await brandingUpdate.mutateAsync(
        kind === "logo"
          ? { logoUrl: publicUrl, logoPath: path }
          : { faviconUrl: publicUrl, faviconPath: path },
      );
    },
    onSuccess: (_, variables) => {
      toast.success(variables.kind === "logo" ? "Logo publicada" : "Favicon publicado");
    },
    onError: (error: any) => toast.error(error.message ?? "Upload nao concluido"),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const currentTenant = tenantId
    ? (tenants.data ?? []).find((tenant: any) => tenant.id === tenantId)
    : (tenants.data ?? [])[0];
  const activeSubscriptions = (subscriptions.data ?? []).filter((item: any) => item.access_status !== "revoked");
  const revokedSubscriptions = (subscriptions.data ?? []).filter((item: any) => item.access_status === "revoked");

  const copy = () => {
    if (!currentTenant?.invite_code) return;
    navigator.clipboard.writeText(currentTenant.invite_code);
    toast.success("Invite code copied");
  };

  return (
    <>
      <PageHeader
        title={isSuperAdmin ? "Organizations" : currentTenant?.name || "Organization"}
        subtitle={
          isSuperAdmin
            ? "Global tenant, member and subscription records from Supabase."
            : "Manage your organization, invite members, configure access."
        }
        action={<Pill tone="olive">{isSuperAdmin ? "Super admin global" : "Organization admin"}</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Organizations" value={tenants.data?.length ?? "-"} sub="Tenants table" tone="olive" />
        <Stat label="Members" value={members.data?.length ?? "-"} sub="Profiles table" tone="moss" />
        <Stat label="Residents" value={residents.data ?? "-"} sub="In care" tone="wine" />
        <Stat
          label="Billing access"
          value={revokedSubscriptions.length ? `${revokedSubscriptions.length} revoked` : `${activeSubscriptions.length} active`}
          sub="Tenant subscriptions"
          tone={revokedSubscriptions.length ? "wine" : "gold"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase text-muted-foreground">
            {currentTenant ? "Invite members" : "Tenant setup"}
          </p>
          {currentTenant ? (
            <>
              <p className="mt-2 text-sm text-foreground/80">
                Share this code so families and caregivers can join this organization.
              </p>
              <div className="mt-4 rounded-2xl bg-cream/60 p-4">
                <p className="text-[10px] uppercase text-muted-foreground">Invite code</p>
                <p className="mt-1 font-mono text-2xl text-olive">{currentTenant.invite_code ?? "-"}</p>
                <button
                  onClick={copy}
                  disabled={!currentTenant.invite_code}
                  className="mt-3 w-full rounded-full bg-olive px-4 py-2 text-xs text-ivory hover:opacity-90 disabled:opacity-50"
                >
                  Copy code
                </button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Status: {currentTenant.status ?? "unknown"} - Billing: {currentTenant.billing_status ?? "unknown"}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No organization exists yet. Create one through onboarding or Supabase before inviting members.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Members</p>
            <Pill tone="moss">{members.data?.length ?? 0} visible</Pill>
          </div>
          <ul className="mt-4 divide-y divide-border/60">
            {members.data?.map((member: any) => (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar name={member.full_name ?? "?"} src={member.avatar_url} tone="olive" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {member.preferred_name || member.full_name || "Unnamed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.user_kind ?? "user"} - {member.account_status ?? "unknown"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {member.roles.length === 0 && <span className="text-[10px] text-muted-foreground">no role</span>}
                    {member.roles.map((role: string) => (
                      <Pill key={role} tone="muted">
                        {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
                      </Pill>
                    ))}
                  </div>
                </div>
              </li>
            ))}
            {members.data?.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">No members yet.</li>
            )}
          </ul>
        </Card>
      </div>

      {isSuperAdmin && (
        <BrandingPanel
          branding={branding.data}
          loading={branding.isLoading}
          busy={brandingUpdate.isPending || uploadBrandAsset.isPending}
          onSaveName={(brandName) => brandingUpdate.mutate({ brandName })}
          onUpload={(kind, file) => uploadBrandAsset.mutate({ kind, file })}
        />
      )}

      {isSuperAdmin && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Controle operacional</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Acesso das organizações</h2>
            </div>
            <Pill tone="olive">RLS ativo</Pill>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {(tenants.data ?? []).map((tenant: any) => (
              <div key={tenant.id} className="rounded-2xl border border-white/70 bg-white/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.slug} - {tenant.invite_code ?? "sem código de convite"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Pill tone={tenant.status === "active" ? "moss" : tenant.status === "suspended" ? "wine" : "gold"}>
                      {tenant.status}
                    </Pill>
                    <Pill tone={["revoked", "suspended"].includes(tenant.billing_status) ? "wine" : "olive"}>
                      {tenant.billing_status}
                    </Pill>
                  </div>
                </div>
                <TenantStatusControls
                  tenant={tenant}
                  busy={tenantStatus.isPending}
                  onChange={(status, billingStatus, reason) =>
                    tenantStatus.mutate({ id: tenant.id, status, billingStatus, reason })
                  }
                />
              </div>
            ))}
            {tenants.data?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Ainda não há organizações.</p>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

function BrandingPanel({
  branding,
  loading,
  busy,
  onSaveName,
  onUpload,
}: {
  branding: PlatformBranding | undefined;
  loading: boolean;
  busy: boolean;
  onSaveName: (brandName: string) => void;
  onUpload: (kind: "logo" | "favicon", file: File) => void;
}) {
  const [brandName, setBrandName] = useState(branding?.brand_name ?? "Care Kranich");

  useEffect(() => {
    if (branding?.brand_name) setBrandName(branding.brand_name);
  }, [branding?.brand_name]);

  const handleFile = (kind: "logo" | "favicon", files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    onUpload(kind, file);
  };

  return (
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Branding global</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Logo e favicon do projeto</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Esses arquivos renderizam no site publico, no SaaS e no icone da aba do navegador.
          </p>
        </div>
        <Pill tone={branding?.logo_url || branding?.favicon_url ? "moss" : "gold"}>
          {loading ? "Carregando" : branding?.logo_url || branding?.favicon_url ? "Publicado" : "Sem arquivos"}
        </Pill>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-white/70 bg-white/45 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Preview atual</p>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <PlatformBrandLogo
              iconClassName="h-14 w-14 rounded-2xl"
              textClassName="text-2xl font-semibold text-olive"
            />
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-cream/55 px-4 py-3">
              {branding?.favicon_url ? (
                <img src={branding.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-olive/10 text-xs font-semibold text-olive">
                  CK
                </span>
              )}
              <span className="text-sm text-muted-foreground">Favicon</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/45 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Nome da marca</p>
          <div className="mt-3 flex gap-2">
            <input
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              className="min-w-0 flex-1 rounded-full border border-border bg-white/70 px-4 py-2 text-sm outline-none focus:border-olive"
            />
            <button
              disabled={busy || brandName.trim().length < 2}
              onClick={() => onSaveName(brandName.trim())}
              className="rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory disabled:opacity-45"
            >
              Salvar
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AssetUpload
              label="Enviar logo"
              hint="PNG, JPG, WebP ou SVG ate 5 MB."
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={busy}
              onChange={(files) => handleFile("logo", files)}
            />
            <AssetUpload
              label="Enviar favicon"
              hint="ICO, PNG, SVG ou WebP ate 1 MB."
              accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,image/webp"
              disabled={busy}
              onChange={(files) => handleFile("favicon", files)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function AssetUpload({
  label,
  hint,
  accept,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  accept: string;
  disabled: boolean;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <label className="block rounded-2xl border border-dashed border-olive/30 bg-baby/10 p-4 transition hover:bg-baby/20">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.files);
          event.currentTarget.value = "";
        }}
        className="mt-3 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-olive file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory disabled:opacity-45"
      />
    </label>
  );
}

function validateBrandAsset(kind: "logo" | "favicon", file: File) {
  const allowed =
    kind === "logo"
      ? ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
      : ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml", "image/webp"];
  const maxSize = kind === "logo" ? 5 * 1024 * 1024 : 1024 * 1024;
  const extension = assetExtension(file);
  const extensionAllowed =
    kind === "logo"
      ? ["png", "jpg", "jpeg", "webp", "svg"].includes(extension)
      : ["ico", "png", "webp", "svg"].includes(extension);
  if (!allowed.includes(file.type) && !extensionAllowed) {
    throw new Error(kind === "logo" ? "Use PNG, JPG, WebP ou SVG para a logo." : "Use ICO, PNG, SVG ou WebP para o favicon.");
  }
  if (file.size > maxSize) {
    throw new Error(kind === "logo" ? "A logo deve ter ate 5 MB." : "O favicon deve ter ate 1 MB.");
  }
}

function assetExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  if (file.type === "image/svg+xml") return "svg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/jpeg") return "jpg";
  return "ico";
}

function TenantStatusControls({
  tenant,
  busy,
  onChange,
}: {
  tenant: any;
  busy: boolean;
  onChange: (status: string, billingStatus?: string, reason?: string) => void;
}) {
  const actions = [
    {
      label: "Ativar",
      status: "active",
      billing: "active",
      reason: null,
      className: "bg-olive text-ivory",
    },
    {
      label: "Trial",
      status: "active",
      billing: "trialing",
      reason: null,
      className: "border border-olive/25 text-olive",
    },
    {
      label: "Pagamento pendente",
      status: "active",
      billing: "past_due",
      reason: "Pagamento em atraso; acesso mantido sob monitoramento.",
      className: "border border-gold/35 text-wine",
    },
    {
      label: "Bloquear cobrança",
      status: "active",
      billing: "revoked",
      reason: "Acesso revogado pelo super admin por status de cobrança.",
      className: "border border-wine/35 text-wine",
    },
    {
      label: "Suspender",
      status: "suspended",
      billing: "suspended",
      reason: "Organização suspensa pelo super admin.",
      className: "border border-wine/35 bg-wine/5 text-wine",
    },
    {
      label: "Rejeitar",
      status: "rejected",
      billing: "revoked",
      reason: "Organização rejeitada pelo super admin.",
      className: "border border-wine/35 text-wine",
    },
  ];

  return (
    <div className="mt-4 border-t border-white/60 pt-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Controles de acesso</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={`${action.status}-${action.billing}`}
            disabled={
              busy ||
              (tenant.status === action.status && tenant.billing_status === action.billing)
            }
            onClick={() => onChange(action.status, action.billing, action.reason ?? undefined)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-45 ${action.className}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
