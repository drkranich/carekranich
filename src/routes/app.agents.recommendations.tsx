import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AGENTS } from "@/lib/agents";
import { toast } from "sonner";

export const Route = createFileRoute("/app/agents/recommendations")({ component: RecsFeed });

type Rec = {
  id: string;
  agent_key: string;
  resident_id: string | null;
  title: string;
  summary: string;
  reasoning: string | null;
  urgency: string;
  category: string;
  confidence: number | null;
  status: string;
  created_at: string;
};

function RecsFeed() {
  const { profile } = useAuth();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [urgency, setUrgency] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");

  const load = async () => {
    if (!profile?.tenant_id) return;
    let q = supabase
      .from("agent_recommendations")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });
    if (urgency !== "all") q = q.eq("urgency", urgency);
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setRecs((data as Rec[]) ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [profile?.tenant_id, urgency, status]);

  const act = async (id: string, next: "acted" | "dismissed") => {
    const { error } = await supabase
      .from("agent_recommendations")
      .update({ status: next, acted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next === "acted" ? "Marked as acted" : "Dismissed");
    load();
  };

  return (
    <>
      <PageHeader
        title="Recommendations Center"
        subtitle="A unified feed of suggestions from every agent - filterable by urgency, status, and category."
        action={
          <Link to="/app/agents" className="text-xs text-muted-foreground hover:text-olive">
            Agent Center
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "open", "acted", "dismissed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs ${status === s ? "bg-olive text-ivory" : "border border-border bg-ivory"}`}
          >
            {s}
          </button>
        ))}
        <span className="mx-2 text-muted-foreground">-</span>
        {["all", "critical", "warning", "info"].map((u) => (
          <button
            key={u}
            onClick={() => setUrgency(u)}
            className={`rounded-full px-3 py-1.5 text-xs ${urgency === u ? "bg-wine text-ivory" : "border border-border bg-ivory"}`}
          >
            {u}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {recs.length === 0 && (
          <Card>
            <p className="text-sm text-muted-foreground">
              No recommendations match these filters yet. Agents will surface them here as they
              observe patterns.
            </p>
          </Card>
        )}
        {recs.map((r) => {
          const agent = AGENTS[r.agent_key as keyof typeof AGENTS];
          return (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill
                      tone={
                        r.urgency === "critical"
                          ? "wine"
                          : r.urgency === "warning"
                            ? "gold"
                            : "moss"
                      }
                    >
                      {r.urgency}
                    </Pill>
                    {agent && <Pill tone="olive">{agent.name}</Pill>}
                    <Pill tone="muted">{r.category}</Pill>
                    {r.confidence != null && (
                      <Pill tone="moss">{Math.round(r.confidence * 100)}% confidence</Pill>
                    )}
                  </div>
                  <p className="mt-2 text-lg font-semibold text-foreground">{r.title}</p>
                  <p className="mt-1 text-sm text-foreground/80">{r.summary}</p>
                  {r.reasoning && (
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer text-olive">
                        Why this recommendation
                      </summary>
                      <p className="mt-1 whitespace-pre-wrap">{r.reasoning}</p>
                    </details>
                  )}
                </div>
                {r.status === "open" && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => act(r.id, "acted")}
                      className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory"
                    >
                      Mark acted
                    </button>
                    <button
                      onClick={() => act(r.id, "dismissed")}
                      className="rounded-full border border-border bg-ivory px-3 py-1.5 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {r.status !== "open" && <Pill tone="muted">{r.status}</Pill>}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
