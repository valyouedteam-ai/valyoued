/**
 * Offline aggregate metrics from a data export (or any JSON with the same estimate shape as GET /me/data-export).
 *
 * Usage:
 *   pnpm --filter @workspace/scripts exec tsx ./src/valuation-replay-eval.ts ./export.json
 *
 * Expects labeled rows: `outcomeSoldPrice` (and matching currency to `adjustedMid` / stored result).
 */

import fs from "node:fs";

type ExportRow = {
  assetTypeId?: string;
  adjustedMid?: number;
  baselineMid?: number;
  outcomeSoldPrice?: number | null;
  result?: { adjustedMid?: number; baselineMid?: number };
};

type ExportPayload = { estimates?: ExportRow[] };

function pickPredictedMid(r: ExportRow): number | null {
  const fromResult =
    typeof r.result?.adjustedMid === "number" && Number.isFinite(r.result.adjustedMid)
      ? r.result.adjustedMid
      : null;
  if (fromResult != null) return fromResult;
  return typeof r.adjustedMid === "number" && Number.isFinite(r.adjustedMid) ? r.adjustedMid : null;
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: tsx valuation-replay-eval.ts <export.json>");
    process.exit(1);
  }
  const raw = fs.readFileSync(path, "utf8");
  const data = JSON.parse(raw) as ExportPayload | ExportRow[];
  const estimates = Array.isArray(data) ? data : data.estimates ?? [];

  /** Labeled midpoint pairs (prediction from stored snapshot, user outcome). */
  const pairs: { assetTypeId: string; predicted: number; outcome: number; ratio: number; ape: number }[] = [];

  for (const r of estimates) {
    const outcome = typeof r.outcomeSoldPrice === "number" ? r.outcomeSoldPrice : null;
    const predicted = pickPredictedMid(r);
    if (outcome == null || outcome <= 0 || predicted == null || predicted <= 0) continue;
    const ratio = predicted / outcome;
    const ape = Math.abs(predicted - outcome) / outcome;
    pairs.push({
      assetTypeId: r.assetTypeId ?? "(unknown)",
      predicted,
      outcome,
      ratio,
      ape,
    });
  }

  const n = pairs.length;
  const meanRatio = n > 0 ? pairs.reduce((s, p) => s + p.ratio, 0) / n : null;
  const mapePct = n > 0 ? (pairs.reduce((s, p) => s + p.ape, 0) / n) * 100 : null;

  const byAsset = new Map<string, typeof pairs>();
  for (const p of pairs) {
    const prev = byAsset.get(p.assetTypeId) ?? [];
    prev.push(p);
    byAsset.set(p.assetTypeId, prev);
  }

  /** Rank coherence within an asset cohort: share of pairwise order matches between predictions and outcomes (skips ties on either axis). */
  function rankAgreement(ps: typeof pairs): number | null {
    if (ps.length < 5) return null;
    let good = 0;
    let total = 0;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const dp = ps[i].predicted - ps[j].predicted;
        const dy = ps[i].outcome - ps[j].outcome;
        if (dp === 0 || dy === 0) continue;
        total++;
        if (Math.sign(dp) === Math.sign(dy)) good++;
      }
    }
    return total === 0 ? null : good / total;
  }

  const cohorts: Record<
    string,
    { count: number; mapePct: number; calibrationRatio: number; rankAgreement?: number | null }
  > = {};

  for (const [assetTypeId, ps] of byAsset) {
    const cn = ps.length;
    cohorts[assetTypeId] = {
      count: cn,
      mapePct:
        cn > 0 ? (ps.reduce((s, p) => s + p.ape, 0) / cn) * 100 : 0,
      calibrationRatio:
        cn > 0 ? ps.reduce((s, p) => s + p.ratio, 0) / cn : 0,
      rankAgreement: rankAgreement(ps),
    };
  }

  const summary = {
    labeledCount: n,
    globalMapePct: mapePct,
    globalCalibrationMeanPredictedOverOutcome: meanRatio,
    perAssetClass: cohorts,
    note:
      "MAPE uses absolute percent error versus user-reported sold price when present. Calibration is mean(predicted/outcome); 1.0 is unbiased on average.",
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
