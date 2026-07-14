import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader, Pill, Avatar, Stat } from "@/components/app/primitives";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tenants")({ component: Tenants });

function Tenants() {
  const { profile, isAdmin, isSuperAdmin, loading } = useAuth();
  const tenantId = profile?.tenant_id ?? null;

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
    </>
  );
}
