import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAiProvider } from "./providers/openai.js";
import type { LlmProvider, LlmProviderId } from "./types.js";
import {
  inferProviderIdFromEnv,
  resolveAnthropicApiKey,
  resolveAnthropicBaseUrl,
  resolveOpenAiApiKey,
  resolveOpenAiBaseUrl,
} from "./env.js";

export function getConfiguredProviderId(): LlmProviderId {
  const raw = process.env.LLM_PROVIDER?.toLowerCase().trim();
  if (raw) {
    if (raw === "anthropic" || raw === "openai") return raw;
    throw new Error(
      `LLM_PROVIDER must be "anthropic" or "openai", got: "${process.env.LLM_PROVIDER}"`,
    );
  }
  return inferProviderIdFromEnv();
}

/**
 * Model id passed to the vendor API. Override with `LLM_MODEL` (typical values: `gpt-4o`, `claude-sonnet-4-5`).
 */
export function defaultModel(): string {
  const override = process.env.LLM_MODEL?.trim();
  if (override) return override;
  return getConfiguredProviderId() === "openai"
    ? "gpt-4o"
    : "claude-sonnet-4-5";
}

export function createLlmProvider(): LlmProvider {
  const id = getConfiguredProviderId();
  if (id === "anthropic") {
    const apiKey = resolveAnthropicApiKey(id);
    const baseURL =
      resolveAnthropicBaseUrl() ?? (apiKey ? "https://api.anthropic.com" : undefined);
    if (!apiKey) {
      throw new Error(
        "Anthropic: set ANTHROPIC_API_KEY (or Replit AI_INTEGRATIONS_ANTHROPIC_API_KEY), or use LLM_PROVIDER=anthropic with LLM_API_KEY.",
      );
    }
    if (!baseURL) {
      throw new Error("Anthropic base URL could not be resolved.");
    }
    const client = new Anthropic({ apiKey, baseURL });
    return createAnthropicProvider(client);
  }

  const apiKey = resolveOpenAiApiKey(id);
  if (!apiKey) {
    throw new Error(
      'OpenAI: set OPENAI_API_KEY, or use LLM_PROVIDER=openai with LLM_API_KEY.',
    );
  }
  const baseURL = resolveOpenAiBaseUrl();
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return createOpenAiProvider(client);
}

let _llm: LlmProvider | null = null;

/** Process-wide singleton; picks provider from env on first use. */
export function getLlm(): LlmProvider {
  if (!_llm) _llm = createLlmProvider();
  return _llm;
}

/** Test hook or forced re-read of env. */
export function resetLlmSingleton(): void {
  _llm = null;
}
