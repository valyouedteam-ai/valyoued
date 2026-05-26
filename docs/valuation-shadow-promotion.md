# Shadow compares and promotion criteria

Purpose: introduce new valuation stages (**retrieval, calibration, richer signals**) **without silently changing** what users rely on until the team agrees the change wins on quality and latency.

## Shadow run (recommended shape)

1. **Flag**: set `VALUATION_EXPERIMENT_KEY` per deploy or cohort; it is copied into each row [`estimates.lineage.experimentKey`](../lib/db/src/schema/estimates.ts) for filtering.
2. **Dual inference**: optionally run challenger logic in parallel inside the worker (today the internal archive snippet is gated on `INTERNAL_COMP_ARCHIVE` plus `luxury-watch` pilot in [`artifacts/api-server/src/lib/internalArchiveSignals.ts`](../artifacts/api-server/src/lib/internalArchiveSignals.ts)).
3. **Observation store**: persist shadow outputs outside the canonical `result` JSONB initially (narrow side table or logs) keyed by estimate id plus experiment key.

This doc does not prescribe a particular queue; Postgres side tables remain the simplest for small volume.

## Promotion checklist

| Gate | Passing condition |
| --- | --- |
| **Accuracy** | On labeled subsets, MAPE and calibration improved or unchanged within an agreed slack (see offline eval doc). Rank agreement should not collapse for liquidity cohorts. |
| **Latency** | Tail p95 stays within UX budget plus network; each new stage declares a fallback path (timeouts already used for archive lookup). |
| **Cost** | Marginal inference cost bounded per valuation tier (extra LLM rounds, embeddings, vendor calls logged in finance dashboards). |
| **Safety** | No new reliance on scraped or unlicensed feeds without Legal sign-off; attributable signals logged with lineage ([`artifacts/api-server/src/lib/valuationLineage.ts`](../artifacts/api-server/src/lib/valuationLineage.ts)). |

## Operational notes

- **Rollback**: lineage `promptSha256` and `promptVersion` tell you exactly which prompts produced historical rows during an incident review.
- **User-visible merge**: flip production to challenger only after shadow metrics hold for a full cohort slice (often one asset class pilot first).

Companion docs: [`valuation-offline-eval.md`](./valuation-offline-eval.md), [`VALUATIONS_AND_PROPRIETARY_MODEL.md`](./VALUATIONS_AND_PROPRIETARY_MODEL.md).
