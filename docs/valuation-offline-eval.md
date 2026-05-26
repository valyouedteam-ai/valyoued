# Offline valuation evaluation (replay harness)

Goal: compare **frozen production snapshots** in `estimates.result` against **new pipelines** (prompt changes, retrieval, calibration heads) without touching live UX.

## Source of truth

- **Stored inputs and outputs**: `estimates.result` JSONB retains the wizard snapshot, comps, narratives, and headline numbers (`adjustedMid`, bands, tier flags).
- **Lineage**: `estimates.lineage` stores `promptVersion`, `promptSha256`, configured LLM provider/model, optional internal-archive `retrievalSnapshotId`, headline signal counts, and `structuredFallback` when the heuristic path ran ([`artifacts/api-server/src/lib/valuationLineage.ts`](../artifacts/api-server/src/lib/valuationLineage.ts)).

## Replay pattern

1. Export or query rows with the cohort you care about (asset class, date range, experiment key).
2. For each row, load `input` (+ optional frozen context such as lineage or stored news fingerprints when you begin logging them verbatim).
3. Run the candidate pipeline offline and write results next to the row (temporary table or local JSON Lines).
4. Compare metrics below.

Privacy: only run on environments covered by retention and DPIA expectations; user exports are gated behind auth ([`GET /me/data-export`](../artifacts/api-server/src/routes/me.ts)).

## Metrics (recommended first three)

| Metric | What it answers | Needs labels? |
| --- | --- | --- |
| **MAPE / MAPE by asset class** | Typical percent gap between **`adjustedMid` (or challenger)** and outcome | Prefer user **sold price** (`outcomeSoldPrice`); sparse early on |
| **Calibration (mean predicted / outcome)** | Systematic under or overpricing (1.0 target) | Same |
| **Rank agreement** | When you sort items within a cohort, do predicted highs track realized highs (pairwise concordance)? | Same; needs enough rows per cohort (see script threshold) |

The repo ships a starter aggregate script over **exported** bundles (not SQL):

```bash
pnpm --filter @workspace/scripts exec tsx ./scripts/src/valuation-replay-eval.ts ./path/to/export.json
```

Extend it once you replay candidate outputs by joining on `estimate.id` or by adding columns to export.

## Acceptance ideas

- **Guardrails**: challenger must not regress MAPE materially on cohorts where data exists.
- **Shadow mode**: dual-run in production logs only (below) until metrics beat control with stable latency.

Related: [`valuation-shadow-promotion.md`](./valuation-shadow-promotion.md), [`VALUATIONS_AND_PROPRIETARY_MODEL.md`](./VALUATIONS_AND_PROPRIETARY_MODEL.md).
