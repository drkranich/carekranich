import { Link, createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Inbox,
  Landmark,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin")({
  component: Admin,
});

type AdminTab =
  | "overview"
  | "tenants"
  | "users"
  | "approvals"
  | "billing"
  | "contracts"
  | "inbox"
  | "marketing"
  | "identity"
  | "documents"
  | "memories"
  | "audit";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tenants", label: "Organizations" },
  { id: "users", label: "Users" },
  { id: "approvals", label: "Approvals" },
  { id: "billing", label: "Plans & billing" },
  { id: "contracts", label: "Contracts" },
  { id: "inbox", label: "Inbox" },
  { id: "marketing", label: "Email" },
  { id: "identity", label: "Identity" },
  { id: "documents", label: "Documents" },
  { id: "memories", label: "Memories" },
  { id: "audit", label: "Audit" },
];

function Admin() {
  const { isSuperAdmin, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");

  const ecosystem = useQuery({
    queryKey: ["super-admin-ecosystem"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const db = supabase as any;
      const [
        tenants,
        profiles,
        approvals,
        plans,
        subscriptions,
        contracts,
        threads,
        templates,
        campaigns,
        identities,
        documents,
        memories,
        audit,
        alerts,
        residents,
      ] = await Promise.all([
        db.from("tenants").select("id,name,slug,status,billing_status,created_at,approved_at").order("created_at", { ascending: false }).limit(100),
        db.from("profiles").select("id,full_name,tenant_id,account_status,user_kind,verification_status,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("platform_approvals").select("id,tenant_id,request_type,requested_role,status,payload,created_at,reviewed_at").order("created_at", { ascending: false }).limit(100),
        db.from("platform_plans").select("id,name,audience,active,stripe_price_id,unit_amount,currency,interval").order("created_at", { ascending: false }).limit(100),
        db.from("tenant_subscriptions").select("id,tenant_id,status,access_status,stripe_price_id,current_period_end,revoked_at").order("created_at", { ascending: false }).limit(100),
        db.from("contracts").select("id,tenant_id,title,contract_type,status,created_at,signed_at").order("created_at", { ascending: false }).limit(100),
        db.from("inbox_threads").select("id,tenant_id,subject,source,status,priority,last_message_at").order("last_message_at", { ascending: false }).limit(100),
        db.from("email_templates").select("id,tenant_id,name,subject,category,is_system,active,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("email_campaigns").select("id,tenant_id,name,audience,status,scheduled_at,sent_at,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("identity_verifications").select("id,tenant_id,user_id,subject_type,provider,status,required,created_at,reviewed_at").order("created_at", { ascending: false }).limit(100),
        db.from("documents").select("id,tenant_id,title,document_type,status,file_size,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("legacy_memories").select("id,tenant_id,resident_id,title,memory_type,visibility,file_size,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("audit_log").select("id,tenant_id,actor_id,action,target_table,target_id,metadata,created_at").order("created_at", { ascending: false }).limit(200),
        db.from("alerts").select("id,tenant_id,severity,status,created_at").order("created_at", { ascending: false }).limit(100),
        db.from("residents").select("id,tenant_id,full_name,created_at").order("created_at", { ascending: false }).limit(100),
      ]);

      const results = {
        tenants: unwrap(tenants),
        profiles: unwrap(profiles),
        approvals: unwrap(approvals),
        plans: unwrap(plans),
        subscriptions: unwrap(subscriptions),
        contracts: unwrap(contracts),
        threads: unwrap(threads),
        templates: unwrap(templates),
        campaigns: unwrap(campaigns),
        identities: unwrap(identities),
        documents: unwrap(documents),
        memories: unwrap(memories),
        audit: unwrap(audit),
        alerts: unwrap(alerts),
        residents: unwrap(residents),
      };

      const errors = [
        tenants,
        profiles,
        approvals,
        plans,
        subscriptions,
        contracts,
        threads,
        templates,
        campaigns,
        identities,
        documents,
        memories,
        audit,
        alerts,
        residents,
      ]
        .map((result) => result.error?.message)
        .filter(Boolean);

      if (errors.length) throw new Error(errors.join(" | "));
      return results;
    },
  });

  const data = ecosystem.data;
  const pendingApprovals = data?.approvals.filter((item: any) => item.status === "pending") ?? [];
  const pendingIdentity = data?.identities.filter((item: any) => item.status !== "verified") ?? [];
  const revokedSubscriptions =
    data?.subscriptions.filter((item: any) => item.access_status === "revoked") ?? [];
  const openThreads = data?.threads.filter((item: any) => item.status !== "closed") ?? [];
  const sensitiveAudit = data?.audit.filter((item: any) => ["sensitive", "critical"].includes(auditSeverity(item))) ?? [];

  const tenantName = useMemo(() => {
    const map = new Map<string, string>();
    (data?.tenants ?? []).forEach((tenant: any) => map.set(tenant.id, tenant.name));
    return map;
  }, [data?.tenants]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!isSuperAdmin) return <Navigate to="/app" />;

  return (
    <>
      <PageHeader
        title="Super admin"
        subtitle="Platform control for organizations, users, approvals, billing, contracts, inbox, campaigns, identity verification and documents."
        action={
          <Pill tone={ecosystem.isError ? "wine" : "moss"}>
            {ecosystem.isError ? "Supabase read error" : "Connected to live Supabase"}
          </Pill>
        }
      />

      <div className="mb-6 overflow-x-auto app-scrollbar">
        <div className="inline-flex min-w-full gap-1 rounded-2xl border border-white/70 bg-white/45 p-1 shadow-soft backdrop-blur-xl">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition ${
                tab === item.id ? "bg-olive text-ivory shadow-soft" : "text-foreground/70 hover:bg-white/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {ecosystem.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading platform data...</p>
      ) : ecosystem.isError ? (
        <Card className="border-wine/25 bg-wine/5">
          <p className="font-medium text-wine">Could not read the platform tables.</p>
          <p className="mt-2 text-sm text-muted-foreground">{(ecosystem.error as Error).message}</p>
        </Card>
      ) : (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Stat label="Organizations" value={data?.tenants.length ?? 0} sub="From tenants table" tone="olive" />
                <Stat label="Users" value={data?.profiles.length ?? 0} sub="From profiles table" tone="moss" />
                <Stat label="Pending approvals" value={pendingApprovals.length} sub="Requires your review" tone="gold" />
                <Stat label="Identity pending" value={pendingIdentity.length} sub="Provider/session needed" tone="wine" />
                <Stat label="Audit events" value={data?.audit.length ?? 0} sub={`${sensitiveAudit.length} sensitive`} tone="terracotta" />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <EcosystemCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title="Approvals needing action"
                  count={pendingApprovals.length}
                  to="/app/approvals"
                  tone="gold"
                />
                <EcosystemCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Identity verification queue"
                  count={pendingIdentity.length}
                  to="/app/identity"
                  tone="wine"
                />
                <EcosystemCard
                  icon={<Inbox className="h-5 w-5" />}
                  title="Open conversations"
                  count={openThreads.length}
                  to="/app/inbox"
                  tone="olive"
                />
                <EcosystemCard
                  icon={<Landmark className="h-5 w-5" />}
                  title="Revoked billing access"
                  count={revokedSubscriptions.length}
                  to="/app/billing"
                  tone="wine"
                />
                <EcosystemCard
                  icon={<Activity className="h-5 w-5" />}
                  title="Sensitive audit events"
                  count={sensitiveAudit.length}
                  to="/app/admin"
                  tone="gold"
                />
              </div>

              <Card>
                <SectionTitle title="Recent platform movement" />
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <RecentList
                    title="Approvals"
                    rows={data?.approvals ?? []}
                    empty="No approval requests."
                    hrefFor={() => "/app/approvals"}
                    render={(item: any) => (
                      <>
                        <span>{item.request_type}</span>
                        <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                      </>
                    )}
                  />
                  <RecentList
                    title="Inbox"
                    rows={data?.threads ?? []}
                    empty="No conversations."
                    hrefFor={(item: any) => `/app/inbox?thread=${item.id}`}
                    render={(item: any) => (
                      <>
                        <span>{item.subject}</span>
                        <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                      </>
                    )}
                  />
                  <RecentList
                    title="Contracts"
                    rows={data?.contracts ?? []}
                    empty="No contracts."
                    hrefFor={() => "/app/contracts"}
                    render={(item: any) => (
                      <>
                        <span>{item.title}</span>
                        <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                      </>
                    )}
                  />
                </div>
              </Card>
            </div>
          )}

          {tab === "tenants" && (
            <TablePanel
              icon={<Building2 className="h-5 w-5" />}
              title="Organizations"
              to="/app/tenants"
              rows={data?.tenants ?? []}
              empty="No organizations found."
              columns={["Name", "Status", "Billing", "Created"]}
              render={(tenant: any) => [
                tenant.name,
                <Pill key="status" tone={statusTone(tenant.status)}>{tenant.status}</Pill>,
                <Pill key="billing" tone={statusTone(tenant.billing_status)}>{tenant.billing_status}</Pill>,
                formatDate(tenant.created_at),
              ]}
            />
          )}

          {tab === "users" && (
            <TablePanel
              icon={<Users className="h-5 w-5" />}
              title="Users"
              to="/app/approvals"
              rows={data?.profiles ?? []}
              empty="No users found."
              columns={["Name", "Kind", "Account", "Identity"]}
              render={(profile: any) => [
                profile.full_name ?? profile.id,
                profile.user_kind,
                <Pill key="account" tone={statusTone(profile.account_status)}>{profile.account_status}</Pill>,
                <Pill key="identity" tone={statusTone(profile.verification_status)}>{profile.verification_status}</Pill>,
              ]}
            />
          )}

          {tab === "approvals" && (
            <TablePanel
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Approvals"
              to="/app/approvals"
              rows={data?.approvals ?? []}
              empty="No approval requests."
              columns={["Request", "Tenant", "Role", "Status"]}
              render={(approval: any) => [
                approval.request_type,
                tenantName.get(approval.tenant_id) ?? approval.payload?.tenant_name ?? "-",
                approval.requested_role ?? "-",
                <Pill key="status" tone={statusTone(approval.status)}>{approval.status}</Pill>,
              ]}
            />
          )}

          {tab === "billing" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <TablePanel
                icon={<Landmark className="h-5 w-5" />}
                title="Plans"
                to="/app/billing"
                rows={data?.plans ?? []}
                empty="No plans found."
                columns={["Plan", "Audience", "Price ID", "Active"]}
                render={(plan: any) => [
                  `${plan.name} ${formatMoney(plan.unit_amount, plan.currency)}`,
                  plan.audience,
                  plan.stripe_price_id ?? "-",
                  <Pill key="active" tone={plan.active ? "moss" : "muted"}>{plan.active ? "active" : "inactive"}</Pill>,
                ]}
              />
              <TablePanel
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Subscriptions"
                to="/app/billing"
                rows={data?.subscriptions ?? []}
                empty="No subscriptions found."
                columns={["Tenant", "Status", "Access", "Price ID"]}
                render={(subscription: any) => [
                  tenantName.get(subscription.tenant_id) ?? subscription.tenant_id,
                  <Pill key="status" tone={statusTone(subscription.status)}>{subscription.status}</Pill>,
                  <Pill key="access" tone={statusTone(subscription.access_status)}>{subscription.access_status}</Pill>,
                  subscription.stripe_price_id ?? "-",
                ]}
              />
            </div>
          )}

          {tab === "contracts" && (
            <TablePanel
              icon={<FileText className="h-5 w-5" />}
              title="Contracts"
              to="/app/contracts"
              rows={data?.contracts ?? []}
              empty="No contracts found."
              columns={["Title", "Tenant", "Type", "Status"]}
              render={(contract: any) => [
                contract.title,
                tenantName.get(contract.tenant_id) ?? "-",
                contract.contract_type,
                <Pill key="status" tone={statusTone(contract.status)}>{contract.status}</Pill>,
              ]}
            />
          )}

          {tab === "inbox" && (
            <TablePanel
              icon={<Inbox className="h-5 w-5" />}
              title="Inbox"
              to="/app/inbox"
              rows={data?.threads ?? []}
              empty="No conversations found."
              columns={["Subject", "Source", "Priority", "Status"]}
              render={(thread: any) => [
                thread.subject,
                thread.source,
                thread.priority,
                <Pill key="status" tone={statusTone(thread.status)}>{thread.status}</Pill>,
              ]}
            />
          )}

          {tab === "marketing" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <TablePanel
                icon={<Mail className="h-5 w-5" />}
                title="Email templates"
                to="/app/email-marketing"
                rows={data?.templates ?? []}
                empty="No templates found."
                columns={["Name", "Subject", "Category", "Type"]}
                render={(template: any) => [
                  template.name,
                  template.subject,
                  template.category,
                  <Pill key="type" tone={template.is_system ? "gold" : "olive"}>{template.is_system ? "system" : "custom"}</Pill>,
                ]}
              />
              <TablePanel
                icon={<Mail className="h-5 w-5" />}
                title="Campaigns"
                to="/app/email-marketing"
                rows={data?.campaigns ?? []}
                empty="No campaigns found."
                columns={["Name", "Audience", "Status", "Sent"]}
                render={(campaign: any) => [
                  campaign.name,
                  campaign.audience,
                  <Pill key="status" tone={statusTone(campaign.status)}>{campaign.status}</Pill>,
                  campaign.sent_at ? formatDate(campaign.sent_at) : "-",
                ]}
              />
            </div>
          )}

          {tab === "identity" && (
            <TablePanel
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Identity verification"
              to="/app/identity"
              rows={data?.identities ?? []}
              empty="No identity checks found."
              columns={["Subject", "Provider", "Required", "Status"]}
              render={(identity: any) => [
                identity.subject_type,
                identity.provider,
                identity.required ? "yes" : "no",
                <Pill key="status" tone={statusTone(identity.status)}>{identity.status}</Pill>,
              ]}
            />
          )}

          {tab === "documents" && (
            <TablePanel
              icon={<FileText className="h-5 w-5" />}
              title="Documents"
              to="/app/documents"
              rows={data?.documents ?? []}
              empty="No documents uploaded."
              columns={["Title", "Tenant", "Type", "Size"]}
              render={(document: any) => [
                document.title,
                tenantName.get(document.tenant_id) ?? "-",
                document.document_type,
                formatBytes(document.file_size),
              ]}
            />
          )}

          {tab === "memories" && (
            <TablePanel
              icon={<FileText className="h-5 w-5" />}
              title="Memory & legacy archive"
              to="/app/memory"
              rows={data?.memories ?? []}
              empty="No memories uploaded."
              columns={["Title", "Tenant", "Type", "Size"]}
              render={(memory: any) => [
                memory.title,
                tenantName.get(memory.tenant_id) ?? "-",
                <Pill key="type" tone="olive">{memory.memory_type}</Pill>,
                formatBytes(memory.file_size),
              ]}
            />
          )}

          {tab === "audit" && (
            <TablePanel
              icon={<Activity className="h-5 w-5" />}
              title="Audit trail"
              to="/app/admin"
              rows={data?.audit ?? []}
              empty="No audit events found."
              columns={["Action", "Target", "Tenant", "When", "Severity"]}
              render={(audit: any) => [
                audit.action,
                `${audit.target_table ?? "-"} ${audit.target_id ? audit.target_id.slice(0, 8) : ""}`,
                tenantName.get(audit.tenant_id) ?? audit.tenant_id ?? "platform",
                formatDateTime(audit.created_at),
                <Pill key="severity" tone={statusTone(auditSeverity(audit))}>{auditSeverity(audit)}</Pill>,
              ]}
            />
          )}
        </>
      )}
    </>
  );
}

function unwrap(result: { data: any[] | null }) {
  return result.data ?? [];
}

function EcosystemCard({
  icon,
  title,
  count,
  to,
  tone,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  to: string;
  tone: "olive" | "wine" | "gold";
}) {
  const toneClass = tone === "wine" ? "text-wine bg-wine/10" : tone === "gold" ? "text-gold bg-gold/15" : "text-olive bg-olive/10";
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
            {icon}
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{count}</p>
        </div>
        <Link to={to as "/app"} className="rounded-full border border-border bg-ivory px-3 py-1.5 text-xs text-olive hover:bg-baby/20">
          Open
        </Link>
      </div>
    </Card>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-xl font-semibold text-foreground">{title}</h2>;
}

function RecentList({
  title,
  rows,
  empty,
  hrefFor,
  render,
}: {
  title: string;
  rows: any[];
  empty: string;
  hrefFor?: (item: any) => string;
  render: (item: any) => ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 5).map((item) => {
          const content = (
            <>
              <div className="min-w-0 flex-1 truncate">{render(item)}</div>
              {hrefFor && (
                <span className="rounded-full border border-olive/20 bg-olive/8 px-3 py-1 text-xs text-olive">
                  Abrir
                </span>
              )}
            </>
          );
          return hrefFor ? (
            <a
              key={item.id}
              href={hrefFor(item)}
              className="flex items-center justify-between gap-3 rounded-xl bg-cream/45 px-3 py-2 text-sm transition hover:bg-white/65"
            >
              {content}
            </a>
          ) : (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream/45 px-3 py-2 text-sm">
              {content}
            </div>
          );
        })}
        {rows.length === 0 && <p className="py-4 text-sm text-muted-foreground">{empty}</p>}
      </div>
    </div>
  );
}

function TablePanel({
  icon,
  title,
  to,
  rows,
  empty,
  columns,
  render,
}: {
  icon: ReactNode;
  title: string;
  to: string;
  rows: any[];
  empty: string;
  columns: string[];
  render: (item: any) => ReactNode[];
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-olive/10 text-olive">
            {icon}
          </span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{rows.length} records from Supabase</p>
          </div>
        </div>
        <Link to={to as "/app"} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">
          Manage
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState title={empty} hint="No placeholder numbers are shown here." />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto app-scrollbar">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/60">
                {columns.map((column) => (
                  <th key={column} className="py-2 text-left font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-border/35 last:border-0">
                  {render(item).map((cell, index) => (
                    <td key={index} className="max-w-[280px] truncate py-3 pr-4 text-foreground/85">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function statusTone(status: string | null | undefined): "moss" | "wine" | "gold" | "olive" | "terracotta" | "muted" {
  const value = String(status ?? "").toLowerCase();
  if (["active", "approved", "verified", "sent", "open", "trialing"].includes(value)) return "moss";
  if (["pending", "draft", "pending_provider_session", "pending_approval", "sensitive"].includes(value)) return "gold";
  if (["rejected", "revoked", "suspended", "void", "failed", "closed", "critical"].includes(value)) return "wine";
  if (["info", "insert", "update"].includes(value)) return "olive";
  return "muted";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function auditSeverity(audit: any) {
  const action = String(audit?.action ?? "").toLowerCase();
  const target = String(audit?.target_table ?? "").toLowerCase();
  if (action.includes("delete") || action.includes("_deleted")) return "critical";
  if (
    [
      "documents",
      "legacy_memories",
      "identity_verifications",
      "tenant_subscriptions",
      "platform_approvals",
      "contracts",
    ].includes(target)
  ) {
    return "sensitive";
  }
  return "info";
}

function formatMoney(cents: number | null | undefined, currency: string | null | undefined) {
  if (typeof cents !== "number") return "";
  return `· ${(cents / 100).toLocaleString(undefined, { style: "currency", currency: currency || "USD" })}`;
}

function formatBytes(value: number | null | undefined) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
