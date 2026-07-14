import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getModel } from "@/lib/ai-gateway.server";
import { AGENTS, type AgentKey } from "@/lib/agents";

const ChatInput = z.object({
  conversationId: z.string().uuid().nullable(),
  agentKey: z.enum([
    "family_companion","caregiver_assistant","clinical","longevity",
    "emotional","operations","emergency","document",
  ]),
  residentId: z.string().uuid().nullable(),
  message: z.string().min(1).max(8000),
});

async function buildResidentContext(supabase: any, residentId: string | null) {
  if (!residentId) return "";
  const [res, obs, evts, plans] = await Promise.all([
    supabase.from("residents").select("full_name,preferred_name,date_of_birth,pronouns,bio,story,hobbies,language").eq("id", residentId).maybeSingle(),
    supabase.from("twin_observations").select("domain,metric,value_numeric,value_text,unit,observed_at").eq("resident_id", residentId).order("observed_at", { ascending: false }).limit(40),
    supabase.from("events").select("title,category,severity,occurred_at,description").eq("resident_id", residentId).order("occurred_at", { ascending: false }).limit(20),
    supabase.from("care_plans").select("title,description,status,priority").eq("resident_id", residentId).limit(10),
  ]);
  const lines: string[] = ["=== RESIDENT CONTEXT ==="];
  if (res.data) lines.push(`Resident: ${res.data.preferred_name ?? res.data.full_name}${res.data.date_of_birth ? ` (DOB ${res.data.date_of_birth})` : ""}. ${res.data.bio ?? ""}`);
  if (plans.data?.length) {
    lines.push("Care plans:"); plans.data.forEach((p: any) => lines.push(`- [${p.status}/${p.priority}] ${p.title}: ${p.description ?? ""}`));
  }
  if (obs.data?.length) {
    lines.push("Recent observations:"); obs.data.forEach((o: any) =>
      lines.push(`- ${o.observed_at?.slice(0,10)} ${o.domain}/${o.metric}: ${o.value_numeric ?? o.value_text ?? ""}${o.unit ?? ""}`));
  }
  if (evts.data?.length) {
    lines.push("Recent events:"); evts.data.forEach((e: any) =>
      lines.push(`- ${e.occurred_at?.slice(0,10)} [${e.severity}] ${e.title}: ${e.description ?? ""}`));
  }
  return lines.join("\n");
}

function parseConfidence(text: string): number | null {
  const m = text.match(/confidence:\s*(low|medium|high)/i);
  if (!m) return null;
  return m[1].toLowerCase() === "high" ? 0.9 : m[1].toLowerCase() === "medium" ? 0.7 : 0.5;
}

export const sendAgentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const agent = AGENTS[data.agentKey as AgentKey];
    if (!agent) throw new Error("Unknown agent");

    // resolve tenant
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = prof?.tenant_id;
    if (!tenantId) throw new Error("No tenant");

    // ensure conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error } = await supabase.from("agent_conversations").insert({
        tenant_id: tenantId, user_id: userId, agent_key: agent.key,
        resident_id: data.residentId, title: data.message.slice(0, 80),
      }).select("id").single();
      if (error) throw new Error(error.message);
      conversationId = conv.id;
    }

    // persist user message
    const { error: umErr } = await supabase.from("agent_messages").insert({
      conversation_id: conversationId, tenant_id: tenantId, role: "user", content: data.message,
    });
    if (umErr) throw new Error(umErr.message);

    // load history (last 20)
    const { data: history } = await supabase.from("agent_messages")
      .select("role,content").eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }).limit(20);

    // build context
    const residentCtx = await buildResidentContext(supabase, data.residentId);

    // load memory
    const { data: mem } = await supabase.from("agent_memory")
      .select("key,value").eq("user_id", userId).eq("agent_key", agent.key).limit(20);
    const memoryBlock = mem?.length
      ? `=== AGENT MEMORY ===\n${mem.map((m: any) => `${m.key}: ${JSON.stringify(m.value)}`).join("\n")}`
      : "";

    const systemFull = [agent.systemPrompt, residentCtx, memoryBlock].filter(Boolean).join("\n\n");

    try {
      const model = getModel();
      const result = await generateText({
        model,
        system: systemFull,
        messages: (history ?? []).map((m: any) => ({ role: m.role as any, content: m.content })),
      });

      const reply = result.text;
      const confidence = parseConfidence(reply);

      const { error: amErr } = await supabase.from("agent_messages").insert({
        conversation_id: conversationId, tenant_id: tenantId, role: "assistant",
        content: reply, confidence,
      });
      if (amErr) throw new Error(amErr.message);

      await supabase.from("agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

      return { conversationId, reply, confidence };
    } catch (e: any) {
      const msg = e?.message ?? "AI provider error";
      await supabase.from("agent_messages").insert({
        conversation_id: conversationId, tenant_id: tenantId, role: "assistant",
        content: `I couldn't reach the AI provider right now. ${msg.includes("429") ? "Rate limit exceeded — please retry shortly." : msg.includes("402") ? "AI credits exhausted — please check the provider billing settings." : "Please try again."}`,
      });
      return { conversationId, reply: "", confidence: null, error: msg };
    }
  });

const RecInput = z.object({
  agentKey: z.string(),
  residentId: z.string().uuid().nullable(),
  title: z.string(),
  summary: z.string(),
  reasoning: z.string().optional(),
  urgency: z.enum(["info", "warning", "critical"]).default("info"),
  category: z.string().default("general"),
});

export const captureRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RecInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    if (!prof?.tenant_id) throw new Error("No tenant");
    const { data: row, error } = await supabase.from("agent_recommendations").insert({
      tenant_id: prof.tenant_id, agent_key: data.agentKey, resident_id: data.residentId,
      title: data.title, summary: data.summary, reasoning: data.reasoning,
      urgency: data.urgency, category: data.category, created_by: userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
