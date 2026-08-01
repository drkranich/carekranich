import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, PageHeader, Pill, Avatar, Stat } from "@/components/app/primitives";
import { PlatformBrandLogo, usePlatformBranding, type PlatformBranding } from "@/components/PlatformBrand";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tenants")({ component: Tenants });

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

type OrgForm = {
  name: string;
  legal_name: string;
  cnpj: string;
  email: string;
  phone: string;
  responsible_name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  notes: string;
};

const EMPTY_FORM: OrgForm = {
  name: "",
  legal_name: "",
  cnpj: "",
  email: "",
  phone: "",
  responsible_name: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  notes: "",
};

function Tenants() {
  const { profile, user, isAdmin, isSuperAdmin, loading, refresh } = useAuth();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id ?? null;
  const branding = usePlatformBranding();
  const [form, setForm] = useState<OrgForm>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tenants = useQuery({
    queryKey: ["tenant-directory", tenantId, isSuperAdmin],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      let query = (supabase as any)
        .from("tenants")
        .select(
          "id,name,slug,invite_code,status,billing_status,branding,created_at,legal_name,cnpj,email,phone,responsible_name,address,city,state,postal_code,country,notes,archived_at",
        )
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

  const invalidateOrgQueries = () => {
    qc.invalidateQueries({ queryKey: ["tenant-directory"] });
    qc.invalidateQueries({ queryKey: ["tenant-members"] });
    qc.invalidateQueries({ queryKey: ["current-tenant-access"] });
  };

  const saveTenant = useMutation({
    mutationFn: async ({ id, data }: { id: string | null; data: OrgForm }) => {
      const trimmed = data.name.trim();
      if (trimmed.length < 3) throw new Error("O nome da organização precisa de pelo menos 3 caracteres.");
      const payload: Record<string, unknown> = {
        name: trimmed,
        legal_name: data.legal_name.trim() || null,
        cnpj: data.cnpj.trim() || null,
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        responsible_name: data.responsible_name.trim() || null,
        address: data.address.trim() || null,
        city: data.city.trim() || null,
        state: data.state.trim() || null,
        postal_code: data.postal_code.trim() || null,
        notes: data.notes.trim() || null,
      };

      if (id) {
        const { error } = await (supabase as any).from("tenants").update(payload).eq("id", id);
        if (error) throw error;
        return { id, name: trimmed, created: false };
      }

      payload.slug = `${slugify(trimmed)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: tenant, error } = await (supabase as any)
        .from("tenants")
        .insert(payload)
        .select("id,name,invite_code")
        .single();
      if (error) throw error;

      // Quem cria sem organização vira admin dela e entra automaticamente.
      if (!isSuperAdmin && user && !tenantId) {
        const { error: profileError } = await (supabase as any)
          .from("profiles")
          .update({ tenant_id: tenant.id })
          .eq("id", user.id);
        if (profileError) throw profileError;
        const { error: roleError } = await (supabase as any)
          .from("user_roles")
          .insert({ user_id: user.id, role: "clinic_admin", tenant_id: tenant.id });
        if (roleError && !String(roleError.message ?? "").includes("duplicate")) throw roleError;
      }
      return { ...tenant, created: true };
    },
    onSuccess: async (result: any) => {
      toast.success(result.created ? `Organização "${result.name}" criada` : "Organização atualizada");
      setForm(EMPTY_FORM);
      setFormOpen(false);
      setEditingId(null);
      await refresh();
      invalidateOrgQueries();
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível salvar a organização"),
  });

  const archiveTenant = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await (supabase as any)
        .from("tenants")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return archive;
    },
    onSuccess: (archived) => {
      toast.success(archived ? "Organização arquivada" : "Organização desarquivada");
      invalidateOrgQueries();
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível arquivar"),
  });

  const deleteTenant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organização excluída");
      invalidateOrgQueries();
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível excluir"),
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
      invalidateOrgQueries();
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
    onError: (error: any) => toast.error(error.message ?? "Não foi possível atualizar a marca"),
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
      if (!publicUrl) throw new Error("Não foi possível gerar a URL pública do arquivo.");

      await brandingUpdate.mutateAsync(
        kind === "logo"
          ? { logoUrl: publicUrl, logoPath: path }
          : { faviconUrl: publicUrl, faviconPath: path },
      );
    },
    onSuccess: (_, variables) => {
      toast.success(variables.kind === "logo" ? "Logo publicada" : "Favicon publicado");
    },
    onError: (error: any) => toast.error(error.message ?? "Upload não concluído"),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const currentTenant = tenantId
    ? (tenants.data ?? []).find((tenant: any) => tenant.id === tenantId)
    : (tenants.data ?? [])[0];
  const activeSubscriptions = (subscriptions.data ?? []).filter((item: any) => item.access_status !== "revoked");
  const revokedSubscriptions = (subscriptions.data ?? []).filter((item: any) => item.access_status === "revoked");

  const copy = () => {
    if (!currentTenant?.invite_code) return;
    navigator.clipboard.writeText(currentTenant.invite_code);
    toast.success("Código de convite copiado");
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const startEdit = (tenant: any) => {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name ?? "",
      legal_name: tenant.legal_name ?? "",
      cnpj: tenant.cnpj ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      responsible_name: tenant.responsible_name ?? "",
      address: tenant.address ?? "",
      city: tenant.city ?? "",
      state: tenant.state ?? "",
      postal_code: tenant.postal_code ?? "",
      notes: tenant.notes ?? "",
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const orgReport = async (tenant: any) => {
    const [{ count: residentCount }, { count: memberCount }] = await Promise.all([
      (supabase as any).from("residents").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      (supabase as any).from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    ]);
    const line = (label: string, value: unknown) => `${label}: ${value ?? "-"}`;
    downloadPdf(
      `organizacao-${tenant.slug ?? tenant.id}`,
      stripAccents(`Relatorio da organizacao - ${tenant.name}`),
      [
        line("Nome", tenant.name),
        line("Razao social", tenant.legal_name),
        line("CNPJ", tenant.cnpj),
        line("E-mail", tenant.email),
        line("Telefone", tenant.phone),
        line("Responsavel", tenant.responsible_name),
        line("Endereco", tenant.address),
        line("Cidade/UF", [tenant.city, tenant.state].filter(Boolean).join(" / ")),
        line("CEP", tenant.postal_code),
        line("Pais", tenant.country),
        "",
        line("Status", tenant.status),
        line("Cobranca", tenant.billing_status),
        line("Arquivada", tenant.archived_at ? new Date(tenant.archived_at).toLocaleDateString("pt-BR") : "Nao"),
        line("Codigo de convite", tenant.invite_code),
        line("Criada em", tenant.created_at ? new Date(tenant.created_at).toLocaleDateString("pt-BR") : "-"),
        "",
        line("Membros", memberCount ?? 0),
        line("Residentes", residentCount ?? 0),
        line("Observacoes", tenant.notes),
        "",
        `Gerado em ${new Date().toLocaleString("pt-BR")} - Care Kranich`,
      ].map((item) => stripAccents(String(item))),
    );
  };

  const field = (key: keyof OrgForm, label: string, placeholder = "", span = 1) => (
    <label className={`block ${span === 2 ? "md:col-span-2" : ""} ${span === 3 ? "md:col-span-3" : ""}`}>
      <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
      <input
        value={form[key]}
        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-sm shadow-soft backdrop-blur-xl outline-none transition focus:border-olive/40 focus:ring-2 focus:ring-olive/20"
      />
    </label>
  );

  return (
    <>
      <PageHeader
        title={isSuperAdmin ? "Organizações" : currentTenant?.name || "Organização"}
        subtitle={
          isSuperAdmin
            ? "Registros globais de organizações, membros e assinaturas."
            : "Gerencie sua organização, convide membros e configure acessos."
        }
        action={
          <div className="flex items-center gap-2">
            <Pill tone="olive">{isSuperAdmin ? "Super admin global" : "Admin da organização"}</Pill>
            <button
              onClick={() => (formOpen ? setFormOpen(false) : startCreate())}
              className="rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory shadow-soft hover:opacity-90"
            >
              {formOpen ? "Fechar formulário" : "+ Criar organização"}
            </button>
          </div>
        }
      />

      {formOpen && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">
              {editingId ? "Editar organização" : "Nova organização"}
            </p>
            {editingId && <Pill tone="gold">Editando</Pill>}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveTenant.mutate({ id: editingId, data: form });
            }}
            className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            {field("name", "Nome da organização *", "Ex.: Lar São Vicente")}
            {field("legal_name", "Razão social", "Ex.: Lar São Vicente Ltda.")}
            {field("cnpj", "CNPJ", "00.000.000/0000-00")}
            {field("email", "E-mail", "contato@organizacao.com.br")}
            {field("phone", "Telefone", "+55 (11) 99999-9999")}
            {field("responsible_name", "Responsável", "Nome do responsável legal")}
            {field("address", "Endereço", "Rua, número, complemento", 2)}
            {field("postal_code", "CEP", "00000-000")}
            {field("city", "Cidade", "São Paulo")}
            {field("state", "UF", "SP")}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">Observações</span>
              <input
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Notas internas"
                className="w-full rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-sm shadow-soft backdrop-blur-xl outline-none transition focus:border-olive/40 focus:ring-2 focus:ring-olive/20"
              />
            </label>
            <div className="flex items-end gap-2 md:col-span-3">
              <button
                type="submit"
                disabled={saveTenant.isPending || form.name.trim().length < 3}
                className="rounded-full bg-olive px-6 py-2 text-xs font-semibold text-ivory disabled:opacity-45"
              >
                {saveTenant.isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Criar organização"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs font-semibold text-foreground"
              >
                Cancelar
              </button>
              {!editingId && (
                <p className="text-[11px] text-muted-foreground">
                  O código de convite é gerado automaticamente.{" "}
                  {!isSuperAdmin && "Você se tornará admin da nova organização."}
                </p>
              )}
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Organizações" value={tenants.data?.length ?? "-"} sub="Tabela tenants" tone="olive" />
        <Stat label="Membros" value={members.data?.length ?? "-"} sub="Tabela profiles" tone="moss" />
        <Stat label="Residentes" value={residents.data ?? "-"} sub="Em cuidado" tone="wine" />
        <Stat
          label="Acesso de cobrança"
          value={revokedSubscriptions.length ? `${revokedSubscriptions.length} revogadas` : `${activeSubscriptions.length} ativas`}
          sub="Assinaturas das organizações"
          tone={revokedSubscriptions.length ? "wine" : "gold"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase text-muted-foreground">
            {currentTenant ? "Convidar membros" : "Configuração da organização"}
          </p>
          {currentTenant ? (
            <>
              <p className="mt-2 text-sm text-foreground/80">
                Compartilhe este código para famílias e cuidadores entrarem nesta organização.
              </p>
              <div className="mt-4 rounded-2xl bg-cream/60 p-4">
                <p className="text-[10px] uppercase text-muted-foreground">Código de convite</p>
                <p className="mt-1 font-mono text-2xl text-olive">{currentTenant.invite_code ?? "-"}</p>
                <button
                  onClick={copy}
                  disabled={!currentTenant.invite_code}
                  className="mt-3 w-full rounded-full bg-olive px-4 py-2 text-xs text-ivory hover:opacity-90 disabled:opacity-50"
                >
                  Copiar código
                </button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Status: {currentTenant.status ?? "desconhecido"} - Cobrança: {currentTenant.billing_status ?? "desconhecida"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Ainda não existe organização. Crie a primeira agora mesmo.
              </p>
              <button
                onClick={startCreate}
                className="mt-4 w-full rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory hover:opacity-90"
              >
                + Criar organização
              </button>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-muted-foreground">Membros</p>
            <Pill tone="moss">{members.data?.length ?? 0} visíveis</Pill>
          </div>
          <ul className="mt-4 divide-y divide-border/60">
            {members.data?.map((member: any) => (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar name={member.full_name ?? "?"} src={member.avatar_url} tone="olive" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {member.preferred_name || member.full_name || "Sem nome"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.user_kind ?? "usuário"} - {member.account_status ?? "desconhecido"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {member.roles.length === 0 && <span className="text-[10px] text-muted-foreground">sem papel</span>}
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
              <li className="py-4 text-sm text-muted-foreground">Ainda não há membros.</li>
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

      {(isSuperAdmin || isAdmin) && (
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
              <div
                key={tenant.id}
                className={`rounded-2xl border border-white/70 bg-white/50 p-4 ${tenant.archived_at ? "opacity-70" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.slug} - {tenant.invite_code ?? "sem código de convite"}
                    </p>
                    {(tenant.cnpj || tenant.city) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[tenant.cnpj, [tenant.city, tenant.state].filter(Boolean).join("/")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tenant.archived_at && <Pill tone="muted">Arquivada</Pill>}
                    <Pill tone={tenant.status === "active" ? "moss" : tenant.status === "suspended" ? "wine" : "gold"}>
                      {tenant.status}
                    </Pill>
                    <Pill tone={["revoked", "suspended"].includes(tenant.billing_status) ? "wine" : "olive"}>
                      {tenant.billing_status}
                    </Pill>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => startEdit(tenant)}
                    className="rounded-full border border-olive/30 bg-white/60 px-3 py-1.5 text-xs font-medium text-olive transition hover:bg-olive hover:text-ivory"
                  >
                    Editar
                  </button>
                  <button
                    disabled={archiveTenant.isPending}
                    onClick={() => archiveTenant.mutate({ id: tenant.id, archive: !tenant.archived_at })}
                    className="rounded-full border border-gold/40 bg-white/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-gold/20 disabled:opacity-45"
                  >
                    {tenant.archived_at ? "Desarquivar" : "Arquivar"}
                  </button>
                  <button
                    onClick={() => orgReport(tenant)}
                    className="rounded-full border border-moss/40 bg-white/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-moss/15"
                  >
                    Relatório PDF
                  </button>
                  {isSuperAdmin && (
                    <button
                      disabled={deleteTenant.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Excluir definitivamente "${tenant.name}"? Todos os dados vinculados (residentes, planos, eventos) serão removidos.`,
                          )
                        ) {
                          deleteTenant.mutate(tenant.id);
                        }
                      }}
                      className="rounded-full border border-wine/35 bg-white/60 px-3 py-1.5 text-xs font-medium text-wine transition hover:bg-wine hover:text-ivory disabled:opacity-45"
                    >
                      Excluir
                    </button>
                  )}
                </div>

                {isSuperAdmin && (
                  <TenantStatusControls
                    tenant={tenant}
                    busy={tenantStatus.isPending}
                    onChange={(status, billingStatus, reason) =>
                      tenantStatus.mutate({ id: tenant.id, status, billingStatus, reason })
                    }
                  />
                )}
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
            Esses arquivos renderizam no site público, no SaaS e no ícone da aba do navegador.
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
              hint="PNG, JPG, WebP ou SVG até 5 MB."
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={busy}
              onChange={(files) => handleFile("logo", files)}
            />
            <AssetUpload
              label="Enviar favicon"
              hint="ICO, PNG, SVG ou WebP até 1 MB."
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
    throw new Error(kind === "logo" ? "A logo deve ter até 5 MB." : "O favicon deve ter até 1 MB.");
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
