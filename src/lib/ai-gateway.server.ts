import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Provider-agnostic gateway. Today wired to Lovable AI Gateway (OpenAI-compatible).
 * Future providers (Anthropic, OpenAI direct, Gemini, custom) can be added here
 * behind the same `getModel(modelId)` abstraction.
 */
export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export type ProviderId = "lovable";

export function getModel(providerId: ProviderId, modelId: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  if (providerId === "lovable") {
    return createLovableAiGatewayProvider(key)(modelId);
  }
  throw new Error(`Unknown provider: ${providerId}`);
}
