import { createHash } from "node:crypto";
import { getConfiguredProviderId, defaultModel } from "@workspace/llm";
import type { StoredValuationLineage } from "@workspace/db";

/** Bump when changing rules in `buildPrompt` in a way that affects valuation behavior. */
export const VALUATION_PROMPT_VERSION = "2026-06-02";

export function sha256Utf8(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function readValuationExperimentKey(): string | null {
  const raw = process.env.VALUATION_EXPERIMENT_KEY?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export function buildStoredLineage(args: {
  promptText: string;
  retrievalSnapshotId: string | null;
  internalArchiveMatchCount: number;
  newsArticleCount: number;
  structuredFallback: boolean;
  webSearchQueries?: string[];
  webSearchHitCount?: number;
  citationUrls?: string[];
}): StoredValuationLineage {
  const provider = getConfiguredProviderId();
  const model = defaultModel();
  return {
    promptVersion: VALUATION_PROMPT_VERSION,
    promptSha256: sha256Utf8(args.promptText),
    llmProvider: provider,
    llmModel: model,
    retrievalSnapshotId: args.retrievalSnapshotId,
    internalArchiveMatchCount: args.internalArchiveMatchCount,
    newsArticleCount: args.newsArticleCount,
    structuredFallback: args.structuredFallback,
    experimentKey: readValuationExperimentKey(),
    webSearchQueries: args.webSearchQueries,
    webSearchHitCount: args.webSearchHitCount,
    citationUrls: args.citationUrls,
  };
}
