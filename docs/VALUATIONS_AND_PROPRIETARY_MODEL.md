# How we make valuations (and data toward a proprietary model)

This describes the **current valuation pipeline** in product and code, and how **data collection and structuring** are laid out to support future **refinement, training, and development** of a proprietary valuation model. It is implementation-backed (primarily `artifacts/api-server/src/lib/estimate.ts`, `artifacts/api-server/src/routes/estimates.ts`, `lib/db`).

See also [Backend architecture](./BACKEND_ARCHITECTURE.md).

## Today: how an estimate gets made

End-to-end, a signed-in user submits a valuation from the wizard. The API:

1. **Validates entitlement** (`resolveUserEntitlements`, monthly caps, tier) in `artifacts/api-server/src/lib/entitlements.ts`.
2. **Loads the asset taxonomy** slice (`artifacts/api-server/src/lib/assetTypes.ts`): fields become structured `EstimateInput` and drive the valuation prompt shape.
3. **Pulls lightweight market context**: Google News RSS via `buildNewsQueries` / `searchNews` in `artifacts/api-server/src/lib/news.ts`, keyed off asset category and seller region. Headlines constrain the **`worldEvents`** block so outputs are anchored to fetched URLs where possible (`artifacts/api-server/src/lib/estimate.ts`).
4. **Calls the LLM** (`@workspace/llm`) once per valuation with a **strict JSON** contract: baseline band, comparables, market signals, arbitrage rows, narratives, optional `proInsights` for qualifying Pro users.
5. **Post-processes** model output server-side before persistence: comparable URL hygiene (`sanitizeComparables`), arbitrage row policy by tradeability and tier, averages `marketSignals` into adjusted prices (`generateEstimate` in `estimate.ts`).
6. **Persists** one row per valuation in Postgres (`lib/db/src/schema/estimates.ts`): denormalized mid prices and **`result` JSONB** holding the full structured response (inputs, comps, narratives, tier flags, optional playbook).
7. **Records usage and telemetry**: increments `estimate_usage_monthly`; emits an append-only **`platform_events`** row with a **minimal** payload (`estimate.created` in `artifacts/api-server/src/lib/platformEvents.ts`).

Patches after creation (`PATCH /estimates/:id`) can store **intent** (`hold` / `monitor` / `sell`) on the estimate row so outcomes stay separable from the initial model snapshot.

## What we store by design

| Store | Purpose for product | Purpose for future model work |
| --- | --- | --- |
| `estimates.result` (JSONB) | Full report rendered in app | Single-document **(input snapshot, intermediate signals, headline numbers, narrative)** for replay, versioning, offline eval, or distillation |
| `estimates` scalar columns | Fast list and stats queries | Join keys, filters (asset type, region via embedded input, tier, time) |
| `estimate_usage_monthly` | Fair use and billing | Volume and cohort stats by month |
| `platform_events` | Admin and analytics | **Stream-friendly** events; schema comment flags **future proprietary model pipelines** |
| `listings` (when used) | Draft listings from estimates | Links listing behavior to a valuation id |
| OpenAPI + `lib/api-zod` | Contract between app, server, clients | **Versioned field definitions** for stable training features |

The **`GET /me/data-export`** endpoint (`artifacts/api-server/src/routes/me.ts`) exports a user’s estimates (including `result`) and related listings as JSON. That is the same shape a privacy-aware internal ETL would start from, subject to policy and consent.

## Product-facing “model” vs proprietary model

**Today**, the numerical and narrative valuation is **primarily LLM-generated** under strict prompts and server-side checks. There is **no separate learned price head** in production; the value is the **structured output** of that step plus deterministic transforms (for example adjusted prices from `marketSignals`).

The **proprietary model** direction is to **own the mapping** from rich, structured inputs and market context to valuation and confidence, using **data this stack already structures** (and will extend), rather than treating each response as a one-off generation.

## Data collection and structuring for the proprietary model

These are **intentional** properties of the codebase that support eventual training and evaluation:

### 1. Canonical record = one valuation row + JSON payload

Keeping **`input`**, **`assetType`**, comps, arbitrage rows, **`marketSignals`**, **`worldEvents`** (with URLs when present), and **`report`** together preserves **alignment** between “what we asked” and “what we showed.” That reduces drift when revisiting old valuations after prompt or schema changes.

### 2. Typed contracts

Generated TypeScript types under `lib/api-zod` (from the API spec) define what a “valid” estimate looks like in the wire format. Breaking changes should bump **`schemaVersion`** on exports or introduce parallel fields deliberately, which is standard practice before large-scale labeling.

### 3. Telemetry that stays lean (`platform_events`)

`platform_events.payload` today avoids stuffing full valuations. The table comment explicitly frames **analytics, admin dashboards, and future proprietary model pipelines**. That suggests a pattern: **wide detail in `estimates`**, **narrow facts in events** when you stream to warehouses or trainers.

Recommended payload discipline (already partly reflected in `estimate.created`): ids, enums, aggregates, geography at region granularity, **not** free-form PII blobs.

### 4. Human-in-the-loop hooks

Storing **`intent`** after the fact separates **seller judgment** from the initial machine output without rewriting history. Listing drafts (`listings`) tie monetization-facing copy back to **`estimateId`**.

Future extensions in the same spirit: explicit **sold price**, **sold date**, **“valuation was helpful”**, or adjudicator corrections, ideally as **additive columns or side tables** so the original **`result`** remains an auditable snapshot.

### 5. External evidence lines

Comparable URLs survive only when they pass **`sanitizeComparables`**. That biases storage toward **item-level evidence** rather than noisy search hubs, which matters if comparables feed semi-supervised or retrieval-augmented training.

News-backed **`worldEvents`** carry **`url` / `publishedAt` / `source`** when grounded in RSS. That supports traceability (“why did we say X then?”) and eventual **weak supervision**, not wholesale scraping of marketplaces (see [Comparables URLs and similar past sales](./comparables-urls-and-past-sales-plan.md)).

## Gaps and next investments (typical roadmap)

These are **not** all implemented; they are the usual bridge from “LLM product” to “proprietary model”:

- **Outcome labels**: realized sale price, time-to-sale, or third-party appraisal for a subset of valuations.
- **Feature store or batch exports**: scheduled, policy-checked extracts from `estimates` (and optional labels) into an offline environment.
- **Model lineage**: log prompt hash, model id, and parser version alongside each row (today, much of this is implicit in deploys).
- **Evaluation harness**: replay stored `input` + frozen context through new models and compare to stored outputs or labels.
- **Governance**: retention windows, region-specific rules, and opt-out that align with `data-export` and Clerk account deletion.

## Key files (quick map)

| Area | Location |
| --- | --- |
| Valuation generation | `artifacts/api-server/src/lib/estimate.ts` |
| News retrieval | `artifacts/api-server/src/lib/news.ts` |
| Estimate HTTP | `artifacts/api-server/src/routes/estimates.ts` |
| Events | `artifacts/api-server/src/lib/platformEvents.ts`, `lib/db/src/schema/platform-events.ts` |
| Persistence | `lib/db/src/schema/estimates.ts`, `estimate-usage.ts` |
| User export | `artifacts/api-server/src/routes/me.ts` (`GET /me/data-export`) |
| API types | `lib/api-zod` |

---

*This document is meant to track product truth and engineering intent. Update it when persistence, telemetry, or governance changes.*
