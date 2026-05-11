import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAiProvider } from "./providers/openai.js";
import type { LlmProvider, LlmProviderId } from "./types.js";

export function getConfiguredProviderId(): LlmProviderId {
  const raw = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase().trim();
  if (raw === "anthropic" || raw === "openai") return raw;
  throw new Error(
    `LLM_PROVIDER must be "anthropic" or "openai", got: "${process.env.LLM_PROVIDER}"`,
  );
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
    const baseURL =
      process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ??
      process.env.ANTHROPIC_BASE_URL;
    const apiKey =
      process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ??
      process.env.ANTHROPIC_API_KEY;
    if (!baseURL || !apiKey) {
      throw new Error(
        "Anthropic requires AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY " +
          "(Replit integration), or ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY.",
      );
    }
    const client = new Anthropic({ apiKey, baseURL });
    return createAnthropicProvider(client);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai.');
  }
  const baseURL = process.env.OPENAI_BASE_URL;
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
