import type { LlmProviderId } from "./types.js";

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

/** Vendor-specific Anthropic / Replit integration keys. */
export function hasAnthropicVendorCredentials(): boolean {
  return Boolean(
    trimEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY") ?? trimEnv("ANTHROPIC_API_KEY"),
  );
}

export function hasOpenAiVendorCredentials(): boolean {
  return Boolean(trimEnv("OPENAI_API_KEY"));
}

export function hasGenericLlmCredentials(): boolean {
  return Boolean(trimEnv("LLM_API_KEY"));
}

/** True when `getLlm()` can build a client for the effective provider (see `LLM_PROVIDER` and vendor keys). */
export function isLlmConfigured(): boolean {
  const forced = process.env.LLM_PROVIDER?.toLowerCase().trim();
  if (forced === "anthropic") {
    return Boolean(resolveAnthropicApiKey("anthropic"));
  }
  if (forced === "openai") {
    return Boolean(resolveOpenAiApiKey("openai"));
  }
  if (hasAnthropicVendorCredentials()) return true;
  if (hasOpenAiVendorCredentials()) return true;
  if (hasGenericLlmCredentials()) return true;
  return false;
}

/**
 * Resolves the active provider when `LLM_PROVIDER` is unset:
 * vendor-specific env wins (Anthropic first), then a lone `LLM_API_KEY` defaults to OpenAI
 * (set `LLM_PROVIDER=anthropic` to use a generic key with Anthropic).
 */
export function inferProviderIdFromEnv(): LlmProviderId {
  if (hasAnthropicVendorCredentials()) return "anthropic";
  if (hasOpenAiVendorCredentials()) return "openai";
  if (hasGenericLlmCredentials()) return "openai";
  return "anthropic";
}

export function resolveAnthropicApiKey(active: LlmProviderId): string | undefined {
  return (
    trimEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY") ??
    trimEnv("ANTHROPIC_API_KEY") ??
    (active === "anthropic" ? trimEnv("LLM_API_KEY") : undefined)
  );
}

export function resolveOpenAiApiKey(active: LlmProviderId): string | undefined {
  return (
    trimEnv("OPENAI_API_KEY") ?? (active === "openai" ? trimEnv("LLM_API_KEY") : undefined)
  );
}

/** Anthropic Messages API base; generic `LLM_BASE_URL` applies when vendor URL is unset. */
export function resolveAnthropicBaseUrl(): string | undefined {
  return (
    trimEnv("AI_INTEGRATIONS_ANTHROPIC_BASE_URL") ??
    trimEnv("ANTHROPIC_BASE_URL") ??
    trimEnv("LLM_BASE_URL")
  );
}

/** OpenAI-compatible API base; generic `LLM_BASE_URL` applies when `OPENAI_BASE_URL` is unset. */
export function resolveOpenAiBaseUrl(): string | undefined {
  return trimEnv("OPENAI_BASE_URL") ?? trimEnv("LLM_BASE_URL");
}
