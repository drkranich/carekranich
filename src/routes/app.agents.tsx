import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { agentsForRoles, AGENT_LIST } from "@/lib/agents";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/agents")({ component: AgentsLayout });

function AgentsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onSub = path !== "/app/agents";
  return onSub ? <Outlet /> : <AgentsHub />;
}

function AgentsHub() {
  const { roles, profile } = useAuth();
  const visible = agentsForRoles(roles);
  const [counts, setCounts] = useState<Record<string, { recs: number; convs: number }>>({});

  useEffect(() => {
    (async () => {
      if (!profile?.tenant_id) return;
      const [{ data: recs }, { data: convs }] = await Promise.all([
        supabase.from("agent_recommendations").select("agent_key").eq("tenant_id", profile.tenant_id),
        supabase.from("agent_conversations").select("agent_key").eq("tenant_id", profile.tenant_id),
      ]);
      const map: Record<string, { recs: number; convs: number }> = {};
      AGENT_LIST.forEach((a) => (map[a.key] = { recs: 0, convs: 0 }));
      recs?.forEach((r: any) => map[r.agent_key] && map[r.agent_key].recs++);
      convs?.forEach((c: any) => map[c.agent_key] && map[c.agent_key].convs++);
      setCounts(map);
    })();
  }, [profile?.tenant_id]);

  return (
    <>
      <PageHeader
        title="AI Agent Center"
        subtitle="A coordinated organization of digital specialists — each with a mission, memory, and confidence."
        action={
          <Link to="/app/agents/recommendations" className="rounded-full bg-olive px-4 py-2 text-xs text-ivory">
            Recommendations
          </Link>
        }
      />

      <Card className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Architecture</p>
        <p className="mt-2 text-sm text-foreground">
          Agents share a tenant-scoped memory layer, a provider-agnostic model gateway, and a recommendations bus.
          Each one is role-gated and resident-aware where relevant. Switching AI providers does not require UI changes.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4 text-xs">
          {["Resident & Twin context", "Tenant memory", "Provider gateway", "Recommendations bus"].map((p) => (
            <div key={p} className="rounded-2xl border border-border bg-cream/40 px-3 py-2 text-center">{p}</div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((a) => {
          const c = counts[a.key] ?? { recs: 0, convs: 0 };
          return (
            <Link key={a.key} to="/app/agents/$agentKey" params={{ agentKey: a.key }} className="group">
              <Card className="h-full transition-all group-hover:shadow-elevated">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-${a.tone}/10 text-${a.tone}`}>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={a.icon}/></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.tagline}</p>
                  </div>
                  <Pill tone="moss">active</Pill>
                </div>
                <p className="mt-3 text-sm text-foreground/80">{a.mission}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.capabilities.map((cap) => (
                    <span key={cap} className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-foreground/70">{cap}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>{c.convs} conversations</span>
                  <span>{c.recs} recommendations</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
