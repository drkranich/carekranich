import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Shield, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useAuth, type AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/approvals")({ component: Approvals });

const roleOptions: AppRole[] = ["family", "caregiver", "nurse", "doctor", "clinic_admin"];
const accountStatusOptions = ["all", "pending", "active", "suspended", "rejected"];
const userKindOptions = ["all", "family", "clinic", "service_provider", "staff"];
const userKindLabels: Record<string, string> = {
  family: "Familia",
  clinic: "Clinica",
  service_provider: "Prestador de servicos",
  staff: "Funcionario",
};

function Approvals() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  if (!isSuperAdmin) return <Navigate to="/app" />;

  const approvals = useQuery({
    queryKey: ["platform-approvals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_approvals")
        .select("id,tenant_id,requested_by,request_type,requested_role,status,note,payload,created_at,reviewed_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useQuery({
    queryKey: ["platform-members"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id,full_name,tenant_id,account_status,user_kind,verification_status"),
        supabase.from("user_roles").select("id,user_id,role,tenant_id"),
      ]);
      const roleMap = new Map<string, any[]>();
      (roles ?? []).forEach((role: any) => {
        const list = roleMap.get(role.user_id) ?? [];
        list.push(role);
        roleMap.set(role.user_id, list);
      });
      return (profiles ?? []).map((profile: any) => ({ ...profile, roles: roleMap.get(profile.id) ?? [] }));
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await (supabase as any).rpc("review_platform_approval", {
        _approval_id: id,
        _status: status,
        _note: status === "approved" ? "Approved from platform console" : "Rejected from platform console",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approval updated");
      qc.invalidateQueries({ queryKey: ["platform-approvals"] });
      qc.invalidateQueries({ queryKey: ["platform-members"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not review request"),
  });

  const accountStatus = useMutation({
    mutationFn: async ({
      userId,
      status,
      note,
    }: {
      userId: string;
      status: "pending" | "active" | "rejected" | "suspended";
      note: string;
    }) => {
      const { error } = await (supabase as any).rpc("set_profile_account_status", {
        _user_id: userId,
        _account_status: status,
        _note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account status updated");
      qc.invalidateQueries({ queryKey: ["platform-members"] });
      qc.invalidateQueries({ queryKey: ["super-admin-control-plane"] });
    },
    onError: (error: any) =>
      toast.error(
        error.message?.includes("function")
          ? "Supabase migration for account controls is not applied yet."
          : error.message ?? "Could not update account status",
      ),
  });

  const addRole = async (userId: string, tenantId: string | null, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, tenant_id: tenantId, role });
    if (error) toast.error(error.message);
    else {
      toast.success("Permission added");
      qc.invalidateQueries({ queryKey: ["platform-members"] });
    }
  };

  const removeRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast.error(error.message);
    else {
      toast.success("Permission removed");
      qc.invalidateQueries({ queryKey: ["platform-members"] });
    }
  };

  const pending = (approvals.data ?? []).filter((item: any) => item.status === "pending");
  const filteredMembers = useMemo(() => {
    return (members.data ?? []).filter((member: any) => {
      const statusAllowed = statusFilter === "all" || member.account_status === statusFilter;
      const kindAllowed = kindFilter === "all" || member.user_kind === kindFilter;
      return statusAllowed && kindAllowed;
    });
  }, [kindFilter, members.data, statusFilter]);

  return (
    <>
      <PageHeader
        title="Approvals & access"
        subtitle="Super admin control for clinics, users, staff permissions and future customer approvals."
        action={<Pill tone="olive">Super admin only</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Pending" value={pending.length} sub="Waiting review" tone="gold" />
        <Stat label="Users" value={members.data?.length ?? "-"} sub="All profiles visible to platform" tone="olive" />
        <Stat label="Approved" value={(members.data ?? []).filter((m: any) => m.account_status === "active").length} sub="Active accounts" tone="moss" />
        <Stat label="Rejected" value={(members.data ?? []).filter((m: any) => m.account_status === "rejected").length} sub="Blocked accounts" tone="wine" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Approval queue</h2>
            <Pill tone="gold">{pending.length} pending</Pill>
          </div>
          <div className="space-y-3">
            {(approvals.data ?? []).map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-white/70 bg-white/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.payload?.tenant_name ?? item.request_type}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.request_type} · {item.requested_role ?? "no role"} · {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Pill tone={item.status === "pending" ? "gold" : item.status === "approved" ? "moss" : "wine"}>
                    {item.status}
                  </Pill>
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground/80">
                  User kind: {item.payload?.user_kind ?? "user"} {item.note ? `· ${item.note}` : ""}
                </p>
                {item.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => review.mutate({ id: item.id, status: "approved" })} className="inline-flex items-center gap-1 rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">
                      <Check className="h-3 w-3" />
                      Approve
                    </button>
                    <button onClick={() => review.mutate({ id: item.id, status: "rejected" })} className="inline-flex items-center gap-1 rounded-full border border-wine/30 px-3 py-1.5 text-xs text-wine">
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {approvals.data?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No requests yet.</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Permissions</h2>
              <Shield className="h-5 w-5 text-olive" />
            </div>
            <Pill tone="olive">{filteredMembers.length} shown</Pill>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <GlassSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={accountStatusOptions.map((status) => ({
                value: status,
                label: status === "all" ? "Todos os status" : status,
              }))}
            />
            <GlassSelect
              value={kindFilter}
              onChange={setKindFilter}
              options={userKindOptions.map((kind) => ({
                value: kind,
                label: kind === "all" ? "Todos os perfis" : userKindLabels[kind] ?? kind,
              }))}
            />
          </div>
          <div className="space-y-3">
            {filteredMembers.map((member: any) => (
              <div key={member.id} className="rounded-2xl border border-white/70 bg-white/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{member.full_name ?? member.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {userKindLabels[member.user_kind] ?? member.user_kind} - {member.account_status} - face: {member.verification_status}
                    </p>
                  </div>
                  <Pill tone={member.account_status === "active" ? "moss" : "gold"}>{member.account_status}</Pill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {member.roles.map((role: any) => (
                    <button
                      key={role.id}
                      onClick={() => role.role !== "super_admin" && removeRole(role.id)}
                      disabled={role.role === "super_admin"}
                      title={role.role === "super_admin" ? "Super admin is protected" : "Remove permission"}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-ivory px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ROLE_LABELS[role.role as AppRole] ?? role.role}
                      {role.role !== "super_admin" && <Trash2 className="h-3 w-3 text-wine" />}
                    </button>
                  ))}
                </div>
                <AccountStatusControls
                  member={member}
                  busy={accountStatus.isPending}
                  onChange={(status) =>
                    accountStatus.mutate({
                      userId: member.id,
                      status,
                      note: `Set to ${status} from approvals console`,
                    })
                  }
                />
                {member.tenant_id && (
                  <GlassSelect
                    className="mt-3"
                    value=""
                    placeholder="Adicionar permissao..."
                    onChange={(value) => addRole(member.id, member.tenant_id, value as AppRole)}
                    options={roleOptions.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
                  />
                )}
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No members match these filters.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function AccountStatusControls({
  member,
  busy,
  onChange,
}: {
  member: any;
  busy: boolean;
  onChange: (status: "pending" | "active" | "rejected" | "suspended") => void;
}) {
  const isProtected = member.roles.some((role: any) => role.role === "super_admin");
  const actions: { status: "pending" | "active" | "rejected" | "suspended"; label: string; tone: string }[] = [
    { status: "active", label: "Ativar", tone: "bg-olive text-ivory" },
    { status: "suspended", label: "Suspender", tone: "border border-gold/35 text-wine" },
    { status: "rejected", label: "Rejeitar", tone: "border border-wine/35 text-wine" },
    { status: "pending", label: "Pendente", tone: "border border-border text-foreground" },
  ];

  return (
    <div className="mt-4 border-t border-white/60 pt-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Account lifecycle</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => onChange(action.status)}
            disabled={busy || isProtected || member.account_status === action.status}
            className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-45 ${action.tone}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      {isProtected && (
        <p className="mt-2 text-[11px] text-muted-foreground">Super admin account is protected from lifecycle changes.</p>
      )}
    </div>
  );
}
