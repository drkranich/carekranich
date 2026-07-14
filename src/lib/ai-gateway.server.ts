import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type ProviderConfig = {
  name: string;
  baseURL: string;
  apiKeyEnv: string;
  authHeader?: string;
};

const PROVIDERS = {
  openai: {
    name: "openai",
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    authHeader: "Authorization",
  },
  compatible: {
    name: "compatible",
    baseURL: process.env.AI_BASE_URL ?? "",
    apiKeyEnv: "AI_API_KEY",
    authHeader: "Authorization",
  },
} satisfies Record<string, ProviderConfig>;

export type ProviderId = keyof typeof PROVIDERS;

function createAiProvider(config: ProviderConfig) {
  const key = process.env[config.apiKeyEnv];
  if (!config.baseURL) throw new Error("Missing AI_BASE_URL");
  if (!key) throw new Error(`Missing ${config.apiKeyEnv}`);

  return createOpenAICompatible({
    name: config.name,
    baseURL: config.baseURL,
    headers: {
      [config.authHeader ?? "Authorization"]: `Bearer ${key}`,
    },
  });
}

export function getModel(modelId = process.env.AI_MODEL ?? "gpt-4.1-mini", providerId: ProviderId = "openai") {
  const config = PROVIDERS[providerId];
  if (!config) throw new Error(`Unknown provider: ${providerId}`);
  return createAiProvider(config)(modelId);
}
