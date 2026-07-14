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

  const tenant = useQuery({
    queryKey: ["tenant", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id,name,slug,invite_code,branding,created_at").eq("id", tenantId!).maybeSingle();
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["tenant-members", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,preferred_name,avatar_url").eq("tenant_id", tenantId!),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role); rolesByUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] }));
    },
  });

  const residents = useQuery({
    queryKey: ["tenant-residents-count", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { count } = await supabase.from("residents").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/app" />;

  const copy = () => {
    if (!tenant.data?.invite_code) return;
    navigator.clipboard.writeText(tenant.data.invite_code);
    toast.success("Invite code copied");
  };

  return (
    <>
      <PageHeader
        title={tenant.data?.name || "Organization"}
        subtitle="Manage your organization, invite members, configure access."
        action={<Pill tone="olive">Organization admin</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Members" value={members.data?.length ?? "—"} sub="Across all roles" tone="olive" />
        <Stat label="Residents" value={residents.data ?? "—"} sub="In care" tone="wine" />
        <Stat label="Plan" value="Pro" sub="Trial · 30 days" tone="gold" />
        <Stat label="Status" value="Active" sub="All systems healthy" tone="moss" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Invite members</p>
          <p className="mt-2 text-sm text-foreground/80">Share this code so families and caregivers can join your organization.</p>
          <div className="mt-4 rounded-2xl bg-cream/60 p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Invite code</p>
            <p className="mt-1 font-mono text-2xl text-olive">{tenant.data?.invite_code ?? "—"}</p>
            <button onClick={copy} className="mt-3 w-full rounded-full bg-olive px-4 py-2 text-xs text-ivory hover:opacity-90">Copy code</button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">New members join as Family. Admins can elevate roles below.</p>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Members</p>
            <Pill tone="moss">{members.data?.length ?? 0} active</Pill>
          </div>
          <ul className="mt-4 divide-y divide-border/60">
            {members.data?.map((m: any) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.full_name ?? "?"} src={m.avatar_url} tone="olive" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{m.preferred_name || m.full_name || "Unnamed"}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {m.roles.length === 0 && <span className="text-[10px] text-muted-foreground">no role</span>}
                    {m.roles.map((r: string) => <Pill key={r} tone="muted">{ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}</Pill>)}
                  </div>
                </div>
              </li>
            ))}
            {members.data?.length === 0 && <li className="py-4 text-sm text-muted-foreground">No members yet.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
