import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { AGENTS, type AgentKey } from "@/lib/agents";
import { supabase } from "@/integrations/supabase/client";
import { sendAgentMessage } from "@/lib/agent-chat.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/app/agents/$agentKey")({ component: AgentWorkspace });

type Msg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  confidence: number | null;
  created_at: string;
};
type Conv = { id: string; title: string | null; updated_at: string; resident_id: string | null };
type Resident = { id: string; full_name: string; preferred_name: string | null };

function AgentWorkspace() {
  const { agentKey } = Route.useParams() as { agentKey: string };
  const agent = AGENTS[agentKey as AgentKey];
  const { roles, profile } = useAuth();
  const navigate = useNavigate();
  const sendFn = useServerFn(sendAgentMessage);

  const allowed = useMemo(
    () => agent && agent.roles.some((r) => roles.includes(r)),
    [agent, roles],
  );

  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent || !profile?.tenant_id) return;
    const tenantId = profile.tenant_id;
    const userId = profile.id;
    (async () => {
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase
          .from("residents")
          .select("id,full_name,preferred_name")
          .eq("tenant_id", tenantId)
          .order("full_name"),
        supabase
          .from("agent_conversations")
          .select("id,title,updated_at,resident_id")
          .eq("user_id", userId)
          .eq("agent_key", agent.key)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);
      setResidents((r as Resident[]) ?? []);
      setConvs((c as Conv[]) ?? []);
      if (agent.needsResident && r && r.length > 0) setResidentId((r as Resident[])[0].id);
    })();
  }, [agent, profile?.tenant_id, profile?.id]);

  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("agent_messages")
        .select("id,role,content,confidence,created_at")
        .eq("conversation_id", activeConv)
        .order("created_at", { ascending: true });
      setMessages((data as Msg[]) ?? []);
    })();
  }, [activeConv]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages.length, busy]);

  if (!agent) return <p className="text-sm text-muted-foreground">Unknown agent.</p>;
  if (!allowed)
    return <p className="text-sm text-muted-foreground">You don't have access to this agent.</p>;

  const newConversation = () => {
    setActiveConv(null);
    setMessages([]);
    setInput("");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (agent.needsResident && !residentId) {
      toast.error("Pick a resident first");
      return;
    }
    setBusy(true);
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      confidence: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    try {
      const res = (await sendFn({
        data: {
          conversationId: activeConv,
          agentKey: agent.key,
          residentId: agent.needsResident ? residentId : null,
          message: text,
        },
      })) as { conversationId: string; reply: string; confidence: number | null; error?: string };
      if (res.error) toast.error(res.error);
      if (!activeConv) setActiveConv(res.conversationId);
      // refresh messages
      const { data } = await supabase
        .from("agent_messages")
        .select("id,role,content,confidence,created_at")
        .eq("conversation_id", res.conversationId)
        .order("created_at", { ascending: true });
      setMessages((data as Msg[]) ?? []);
      // refresh sidebar
      const { data: c } = await supabase
        .from("agent_conversations")
        .select("id,title,updated_at,resident_id")
        .eq("user_id", profile!.id)
        .eq("agent_key", agent.key)
        .order("updated_at", { ascending: false })
        .limit(20);
      setConvs((c as Conv[]) ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Send failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={agent.name}
        subtitle={agent.mission}
        action={
          <Link to="/app/agents" className="text-xs text-muted-foreground hover:text-olive">
            All agents
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        {/* Conversations rail */}
        <Card padded={false} className="flex h-[70vh] flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-xs uppercase text-muted-foreground">Conversations</p>
            <button
              onClick={newConversation}
              className="rounded-full bg-olive px-2.5 py-1 text-[11px] text-ivory"
            >
              New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {convs.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet.</p>
            )}
            {convs.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={`block w-full truncate rounded-xl px-3 py-2 text-left text-sm ${activeConv === c.id ? "bg-olive text-ivory" : "hover:bg-cream"}`}
              >
                {c.title ?? "Untitled"}
                <span className="block text-[10px] opacity-70">
                  {new Date(c.updated_at).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat */}
        <Card padded={false} className="flex h-[70vh] flex-col">
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl bg-${agent.tone}/10 text-${agent.tone}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d={agent.icon} />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">{agent.name}</p>
            {agent.needsResident && (
              <select
                value={residentId ?? ""}
                onChange={(e) => setResidentId(e.target.value || null)}
                className="ml-auto rounded-full border border-border bg-ivory px-3 py-1.5 text-xs"
              >
                <option value="">Select resident...</option>
                {residents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.preferred_name ?? r.full_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Try one of these:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {agent.starters.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full border border-border bg-cream px-3 py-1.5 text-xs hover:bg-ivory"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : ""}`}>
                {m.role === "user" ? (
                  <div className="rounded-2xl bg-olive px-4 py-2.5 text-sm text-ivory">
                    {m.content}
                  </div>
                ) : (
                  <div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {m.content}
                    </div>
                    {m.confidence != null && (
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Pill
                          tone={
                            m.confidence >= 0.85
                              ? "moss"
                              : m.confidence >= 0.65
                                ? "gold"
                                : "terracotta"
                          }
                        >
                          confidence {Math.round(m.confidence * 100)}%
                        </Pill>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground">{agent.name} is thinking...</p>}
          </div>

          <div className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={`Ask ${agent.name}...`}
                className="flex-1 resize-none rounded-2xl border border-border bg-ivory px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-olive"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="rounded-full bg-olive px-4 py-2 text-xs text-ivory disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </Card>

        {/* Context rail */}
        <Card className="h-[70vh] overflow-y-auto">
          <p className="text-xs uppercase text-muted-foreground">About this agent</p>
          <p className="mt-2 text-sm text-foreground">{agent.tagline}</p>
          <div className="mt-4">
            <p className="text-[11px] uppercase text-muted-foreground">Capabilities</p>
            <ul className="mt-1 space-y-1 text-sm text-foreground/80">
              {agent.capabilities.map((c) => (
                <li key={c}>- {c}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <p className="text-[11px] uppercase text-muted-foreground">Memory</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tenant-scoped; persists preferences and resident context across sessions.
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[11px] uppercase text-muted-foreground">Provider</p>
            <Pill tone="moss">OpenAI-compatible AI - configurable model</Pill>
          </div>
        </Card>
      </div>
    </>
  );
}
