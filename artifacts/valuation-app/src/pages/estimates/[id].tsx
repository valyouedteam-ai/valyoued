import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import type { ArbitrageOption, Comparable } from "@workspace/api-client-react";
import {
  useGetEstimate,
  getGetEstimateQueryKey,
  getGetEstimateStatsQueryKey,
  getListEstimatesQueryKey,
  usePatchEstimate,
} from "@workspace/api-client-react";
import {
  formatMoney,
  formatPercent,
  formatDate,
  stripRedundantOuterQuotes,
} from "@/lib/format";
import {
  ArrowLeft,
  Scale,
  Globe2,
  Target,
  AlertTriangle,
  Handshake,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Newspaper,
  CircleDot,
  Sparkles,
  Clock,
  Megaphone,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProTier } from "@/hooks/use-pro-tier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GenerateListingDialog } from "@/components/GenerateListingDialog";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { useToast } from "@/hooks/use-toast";
import {
  PLATFORM_LABEL,
  PLATFORM_URL,
  matchPlatformSlug,
  platformSearchUrl,
  platformsForAssetType,
} from "@/lib/platforms";
import { safeHttpUrl } from "@/lib/safe-url";

/** Cost breakdown under each marketplace row. */
function ArbitrageVenueFeeBreakdown({
  option,
  comparablesAnchors,
  adjustedMidLabel,
  sellerRegionLabel,
}: {
  option: ArbitrageOption;
  comparablesAnchors: Comparable[];
  adjustedMidLabel: string;
  sellerRegionLabel: string;
}) {
  const cur = option.currency || "USD";
  const fm = (n: number) => formatMoney(n, cur);
  const gross = option.estimatedSalePrice;
  const modeledNet = gross - (option.estimatedFees + option.estimatedShipping + option.estimatedDuties);
  const netDelta = modeledNet - option.netToSeller;
  const tallyOk =
    Number.isFinite(netDelta) &&
    gross > 0 &&
    (Math.abs(netDelta) <= Math.max(2, gross * 0.02) ||
      Math.abs(netDelta / Math.max(option.netToSeller, 1)) <= 0.03);

  return (
    <div className="no-print space-y-4 rounded-2xl border border-border/50 bg-muted/20 p-4 text-sm md:p-5">
      <p className="font-medium text-foreground">Rough costs for this marketplace</p>
      <p className="text-muted-foreground leading-relaxed">
        This row uses your main estimate (<span className="tabular-nums font-medium text-foreground">{adjustedMidLabel}</span>) as a
        starting point, then guesses what listing in <span className="font-medium text-foreground">{option.marketplace}</span> in{" "}
        <span className="font-medium text-foreground">{option.region}</span> might look like after typical fees.
      </p>

      {comparablesAnchors.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sales we linked to your estimate</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {comparablesAnchors.map((c, i) => (
              <li key={i}>
                <span className="font-medium capitalize text-foreground">{c.source}</span>, {c.year}: {c.description} at{" "}
                <span className="tabular-nums font-medium text-foreground">{fm(c.price)}</span>.
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
          We could not attach specific sale links here. The numbers still follow from your estimate above and the short note on the row.
        </p>
      )}

      <div className="grid gap-3 rounded-xl bg-background/80 p-3 text-xs sm:grid-cols-2">
        <div>
          <p className="font-medium text-foreground">Site fees</p>
          <p className="mt-1 text-muted-foreground">
            About <span className="tabular-nums font-medium text-foreground">{fm(option.estimatedFees)}</span> to{" "}
            {option.marketplace}. Real fees depend on your seller plan and promos.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">Shipping (insured)</p>
          <p className="mt-1 text-muted-foreground">
            About <span className="tabular-nums font-medium text-foreground">{fm(option.estimatedShipping)}</span> from{" "}
            <span className="font-medium text-foreground">{sellerRegionLabel || "your area"}</span> to the buyer in{" "}
            <span className="font-medium text-foreground">{option.region}</span>.
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="font-medium text-foreground">Import tax or duty</p>
          <p className="mt-1 text-muted-foreground">
            {option.estimatedDuties <= 0
              ? "None estimated for this case (often same-country sales)."
              : (
                <>
                  About <span className="tabular-nums font-medium text-foreground">{fm(option.estimatedDuties)}</span> when the
                  buyer receives the item in <span className="font-medium text-foreground">{option.region}</span>.
                </>
              )}
          </p>
        </div>
      </div>

      <blockquote className="rounded-xl border border-border/50 bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Demand note:</span> {option.demandNote}
      </blockquote>

      <dl className="grid gap-2 rounded-xl border border-border/50 bg-card/90 p-3 text-xs tabular-nums md:text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Typical listing price</dt>
          <dd className="font-medium">{fm(gross)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted-foreground">
          <dt>Site fees</dt>
          <dd>-{fm(option.estimatedFees)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted-foreground">
          <dt>Shipping</dt>
          <dd>-{fm(option.estimatedShipping)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-muted-foreground">
          <dt>Tax or duty</dt>
          <dd>-{fm(option.estimatedDuties)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border/60 pt-2 font-semibold text-foreground">
          <dt>About what you keep</dt>
          <dd>{fm(option.netToSeller)}</dd>
        </div>
      </dl>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Figures are rounded and can drift slightly when the model stacks fees in a different order.
        {!tallyOk ? " A small gap here is usually rounding." : " This line adds up within a small tolerance."} Check final quotes on
        the marketplace and with a courier before you commit.
      </p>
    </div>
  );
}

export default function EstimateReportPage() {
  const params = useParams();
  const id = params.id as string;
  const { isPro: globalPro } = useProTier();
  const { data: billing } = useBillingSummary();
  const billingPaid = Boolean(billing?.hasPaidValuationTier);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [listingOpen, setListingOpen] = useState(false);
  const [openedBreakdownIdx, setOpenedBreakdownIdx] = useState<number | null>(null);

  const patchIntent = usePatchEstimate({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(getGetEstimateQueryKey(variables.id), data);
        void queryClient.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetEstimateStatsQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Could not save intent",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      },
    },
  });

  const { data: estimate, isLoading } = useGetEstimate(id, {
    query: { enabled: !!id, queryKey: getGetEstimateQueryKey(id) },
  });

  useEffect(() => {
    setOpenedBreakdownIdx(null);
  }, [id]);

  useEffect(() => {
    const rows = estimate?.arbitrage;
    if (!rows?.length) return;
    setOpenedBreakdownIdx((curr) => {
      if (curr !== null) return curr;
      const rec = rows.findIndex((r) => r.recommended);
      return rec >= 0 ? rec : null;
    });
  }, [estimate?.arbitrage]);

  const proInsightsSanitized = useMemo(() => {
    if (!estimate?.proInsights) return null;
    const p = estimate.proInsights;
    const sq = stripRedundantOuterQuotes;
    return {
      ...p,
      negotiationTactics: p.negotiationTactics.map((t) => ({
        title: sq(t.title),
        detail: sq(t.detail),
      })),
      talkingPoints: (p.talkingPoints ?? []).map(sq),
      redFlags: (p.redFlags ?? []).map(sq),
      listingTips: (p.listingTips ?? []).map(sq),
      optimalTiming: sq(p.optimalTiming ?? ""),
    };
  }, [estimate]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl animate-pulse space-y-10 px-4 pt-8 sm:px-6">
        <div className="h-9 w-28 rounded-full bg-muted" />
        <div className="h-12 max-w-xl rounded-xl bg-muted" />
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="h-52 rounded-3xl bg-muted" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-14 text-center">
        <h2 className="text-lg font-semibold text-foreground">We couldn&apos;t open this report</h2>
        <p className="mt-2 text-sm text-muted-foreground">It may have been removed or you may not have access.</p>
        <Link href="/estimates">
          <Button className="mt-6" variant="outline">
            Back to reports
          </Button>
        </Link>
      </div>
    );
  }

  // International marketplace table (where listing might pay best) requires a Pro-generated estimate or an active paid valuation plan. The header Pro preview alone does not unlock it.
  const savedTierPro = estimate.tier === "pro";
  const payBestVenuesUnlocked = savedTierPro || billingPaid;
  const reportBadgePro = savedTierPro || globalPro || billingPaid;
  const showExpandedPro = savedTierPro || globalPro || billingPaid;

  const uplift = (estimate.netMarketFactor ?? 1) - 1;
  const ccy = estimate.currency ?? "USD";
  const assetTypeName = estimate.assetType?.name ?? "Asset";
  const isMobile = estimate.assetType?.internationallyTradeable ?? false;
  const stripQ = stripRedundantOuterQuotes;
  const estimateTitle = estimate.input?.title ?? "Untitled";
  const sellerRegion = estimate.input?.currentRegion ?? estimate.bestArbitrageRegion ?? "";
  const estimateIdResolved = (estimate.id ?? id) || "";
  const partialReport = estimate.report;
  const report = {
    headline: stripQ(partialReport?.headline ?? estimateTitle),
    summary:
      stripQ(
        partialReport?.summary ??
          "Legacy valuation. Narrative sections may be incomplete.",
      ),
    baselineNarrative: stripQ(partialReport?.baselineNarrative ?? ""),
    marketNarrative: stripQ(partialReport?.marketNarrative ?? ""),
    arbitrageNarrative: stripQ(partialReport?.arbitrageNarrative ?? ""),
    worldEventsNarrative: stripQ(partialReport?.worldEventsNarrative ?? ""),
    finalNarrative: stripQ(partialReport?.finalNarrative ?? ""),
  };

  const arbitrageRows = estimate.arbitrage ?? [];
  const comparables = estimate.comparables ?? [];
  const currentYear = new Date().getFullYear();
  const staleSaleBeforeYear = currentYear - 3;
  const fmt = (v: number, compact = false) => formatMoney(v, ccy, compact);
  const compAnchorsTop = comparables.slice(0, 4);
  const adjustedMidLabel = fmt(estimate.adjustedMid);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-2 print:max-w-none print:px-0 print:pb-0 sm:px-6">
      <div className="no-print mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/estimates">
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> All reports
          </Button>
        </Link>
        <Button
          size="sm"
          onClick={() => setListingOpen(true)}
          className="bg-accent text-accent-foreground hover:bg-accent/90 sm:shrink-0"
          data-testid="report-list-btn"
        >
          <Megaphone className="mr-2 h-4 w-4" /> Draft an ad
        </Button>
      </div>

      <GenerateListingDialog
        estimateId={estimateIdResolved}
        estimateTitle={estimateTitle}
        assetTypeName={assetTypeName}
        sellerRegion={estimate.input?.currentRegion ?? estimate.bestArbitrageRegion ?? null}
        open={listingOpen}
        onOpenChange={setListingOpen}
      />

      <header className="mb-14 space-y-8 print:break-inside-avoid">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="text-foreground/90">{assetTypeName}</span>
            {sellerRegion ? (
              <>
                <span className="text-border" aria-hidden>
                  ·
                </span>
                <span>{sellerRegion}</span>
              </>
            ) : null}
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span className="tabular-nums">{ccy}</span>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <time dateTime={estimate.createdAt}>{formatDate(estimate.createdAt)}</time>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!reportBadgePro ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Summary report</span>
            ) : (
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">Full report</span>
            )}
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem] md:leading-[1.15]">
            {report.headline}
          </h1>
          {report.summary ? (
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{report.summary}</p>
          ) : null}
        </div>

        <section className="no-print rounded-2xl border border-border/50 bg-muted/25 p-1 sm:inline-flex">
          <div className="flex flex-col gap-1 sm:flex-row">
            {(["hold", "monitor", "sell"] as const).map((intent) => (
              <Button
                key={intent}
                type="button"
                size="sm"
                variant={estimate.intent === intent ? "default" : "ghost"}
                className={estimate.intent === intent ? "" : "text-muted-foreground"}
                disabled={patchIntent.isPending}
                onClick={() => {
                  patchIntent.mutate(
                    { id: estimate.id, data: { intent } },
                    {
                      onSuccess: () => {
                        if (intent === "sell") setListingOpen(true);
                      },
                    },
                  );
                }}
              >
                {intent === "hold" ? "Keeping it" : intent === "monitor" ? "Watching price" : "Getting ready to sell"}
              </Button>
            ))}
          </div>
        </section>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm print:border-border print:shadow-none">
          <div className="border-b border-border/50 bg-gradient-to-br from-accent/[0.07] via-transparent to-transparent p-6 sm:p-8 md:p-10">
            <p className="text-sm font-medium text-muted-foreground">Estimate today</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-foreground sm:text-6xl">{fmt(estimate.adjustedMid)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Likely band {fmt(estimate.adjustedLow, true)} to {fmt(estimate.adjustedHigh, true)}
            </p>
            {uplift !== 0 ? (
              <p
                className={cn(
                  "mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                  uplift > 0
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400",
                )}
              >
                {uplift > 0 ? "Up" : "Down"} about {formatPercent(Math.abs(uplift))} vs sales-only view
              </p>
            ) : null}
            {report.marketNarrative ? (
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground/85 sm:text-base">{report.marketNarrative}</p>
            ) : null}
          </div>
          <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-border/50">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From similar sales</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{fmt(estimate.baselineMid)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Range {fmt(estimate.baselineLow, true)} to {fmt(estimate.baselineHigh, true)}
              </p>
              {report.baselineNarrative ? (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{report.baselineNarrative}</p>
              ) : null}
            </div>
            <div className="border-t border-border/50 p-6 sm:border-t-0 sm:p-8">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The larger number layers news, seasonality, and demand on top of what similar items have sold for. Use the range,
                not a single figure, when you talk to buyers.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-16 md:space-y-20">
        {!showExpandedPro && (
          <section className="print-break-inside-avoid rounded-3xl border border-border/60 bg-muted/15 p-6 sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {savedTierPro ? "Turn on Pro preview to see the rest" : "See the full picture"}
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {savedTierPro
                      ? "This report was run with full detail. Flip the Pro switch in the header to show news, similar sales, and seller tips."
                      : "Add news, where to list, similar sales, and step-by-step selling help."}
                  </p>
                </div>
              </div>
              {!savedTierPro ? (
                <div className="flex shrink-0 flex-col gap-3 md:items-end">
                  <Link href="/settings">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Upgrade in settings</Button>
                  </Link>
                  <p className="text-xs text-muted-foreground md:text-right">Everyday+ or Professional</p>
                </div>
              ) : null}
            </div>
            {!savedTierPro ? (
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Clock, text: "Good times to list" },
                  { icon: Newspaper, text: "How headlines might change your price" },
                  { icon: Globe2, text: isMobile ? "Where abroad might pay more" : "Where local buyers shop most" },
                  { icon: Scale, text: "Similar sales you can point to" },
                  { icon: Target, text: "Prices to open with and walk away from" },
                ].map((f) => (
                  <li key={f.text} className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 text-sm">
                    <f.icon className="h-4 w-4 shrink-0 text-accent" />
                    <span className="text-foreground/90">{f.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )}

        {/* World Events – PRO ONLY */}
        {showExpandedPro && estimate.worldEvents && estimate.worldEvents.length > 0 && (
          <section className="space-y-6 print:break-inside-avoid">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">News that may tilt the price</h2>
              {report.worldEventsNarrative ? (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{report.worldEventsNarrative}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {estimate.worldEvents.map((ev, i) => {
                const tone =
                  ev.sentiment === "positive"
                    ? "border-green-500/35 bg-green-500/[0.04]"
                    : ev.sentiment === "negative"
                      ? "border-red-500/35 bg-red-500/[0.04]"
                      : "border-border/60 bg-muted/15";
                const dot =
                  ev.sentiment === "positive"
                    ? "text-green-600 dark:text-green-400"
                    : ev.sentiment === "negative"
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground";
                return (
                  <article key={i} className={`rounded-2xl border p-5 ${tone}`}>
                    <div className="flex items-start gap-3">
                      <CircleDot className={`mt-0.5 h-4 w-4 shrink-0 ${dot}`} aria-hidden />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold leading-snug text-foreground">{stripQ(ev.title)}</h3>
                          {ev.scope ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">{ev.scope}</span>
                          ) : null}
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{stripQ(ev.summary)}</p>
                        {(ev.source || ev.url || ev.publishedAt) && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            {ev.source ? <span>{ev.source}</span> : null}
                            {ev.publishedAt ? (
                              <span className="tabular-nums">
                                {(() => {
                                  const d = new Date(ev.publishedAt);
                                  return Number.isNaN(d.getTime()) ? ev.publishedAt : d.toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  });
                                })()}
                              </span>
                            ) : null}
                            {ev.url ? (
                              <a href={ev.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center font-medium text-accent hover:underline">
                                Read article
                                <ChevronRight className="ml-0.5 h-3 w-3" />
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Where to sell estimates: Pro-tier generation or paid plan */}
        {showExpandedPro && payBestVenuesUnlocked && arbitrageRows.length > 0 && (
          <section className="space-y-8 print:break-inside-avoid">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {isMobile ? "Where listing might pay best" : "Local sites and payouts"}
              </h2>
              <ul className="mt-4 max-w-2xl list-none space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>These rows are rough: list price minus typical fees, shipping, and duties so you can compare destinations side by side.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>Open a row for a fee breakdown and quick notes.</span>
                </li>
              </ul>
            </div>

            {compAnchorsTop.length > 0 ? (
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 sm:p-6">
                <p className="text-sm font-medium text-foreground">Sales shaping this estimate</p>
                <p className="mt-1 text-xs text-muted-foreground">References the model used for your headline range.</p>
                <ul className="mt-4 list-disc space-y-2.5 pl-5 text-sm text-muted-foreground marker:text-muted-foreground/60">
                  {compAnchorsTop.map((c, idx) => (
                    <li key={idx} className="pl-0.5">
                      <span className="font-medium text-foreground">{c.source}</span>, {c.year}: {c.description} at{" "}
                      <span className="tabular-nums font-medium text-foreground">{fmt(c.price)}</span>.
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-4 sm:px-5 sm:py-5">
                <p className="text-sm font-medium text-foreground">No matched sold listings</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We could not tie this to specific sold listings.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The table below still follows from your headline estimate. Open a row for detail.
                </p>
              </div>
            )}

            {report.arbitrageNarrative?.trim() ? (
              <div className="max-w-2xl space-y-3 rounded-xl border border-border/40 bg-muted/10 px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Regional angle</p>
                {report.arbitrageNarrative
                  .trim()
                  .split(/\n\s*\n/)
                  .map((block) => block.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                      {para}
                    </p>
                  ))}
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Compare destinations</p>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-border/50 bg-card shadow-sm">
              <Table className="min-w-[58rem] w-full table-fixed lg:min-w-full">
                <TableHeader className="border-b border-border/50 bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[26%] min-w-[13rem] whitespace-normal px-4 py-3.5 pl-6 text-left font-medium text-foreground first:rounded-tl-2xl">
                      Place
                    </TableHead>
                    <TableHead className="w-[22%] min-w-[12rem] whitespace-normal px-4 py-3.5 text-left font-medium text-foreground">
                      Site
                    </TableHead>
                    <TableHead className="w-[12%] min-w-[7.5rem] whitespace-nowrap px-4 py-3.5 text-right font-medium text-foreground">
                      List price*
                    </TableHead>
                    <TableHead className="w-[14%] min-w-[8.5rem] whitespace-normal px-4 py-3.5 text-right text-muted-foreground">
                      Costs*
                      <div className="mt-0.5 text-[11px] font-normal normal-case leading-snug text-muted-foreground/80">
                        Fees, ship, duty
                      </div>
                    </TableHead>
                    <TableHead className="w-[12%] min-w-[7.5rem] whitespace-nowrap px-4 py-3.5 text-right font-semibold text-foreground">
                      You&apos;d keep*
                    </TableHead>
                    <TableHead className="w-[14%] min-w-[10.5rem] whitespace-nowrap px-4 py-3.5 pr-6 text-right font-medium last:rounded-tr-2xl">
                      Post listing
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arbitrageRows.map((option, i) => {
                    const friction = option.estimatedFees + option.estimatedShipping + option.estimatedDuties;
                    const slug = matchPlatformSlug(option.marketplace);
                    const postUrl = slug ? PLATFORM_URL[slug] : null;
                    return (
                      <Fragment key={`${option.region}-${option.marketplace}-${i}`}>
                        <TableRow className={cn("border-border/40", option.recommended ? "bg-accent/[0.06]" : "")}>
                          <TableCell className="align-top px-4 py-4 pl-6 text-sm font-medium leading-snug">
                            <div className="flex max-w-none flex-col gap-2">
                              <span className="text-base font-semibold text-foreground">{option.region}</span>
                              {option.recommended ? (
                                <span className="inline-flex w-fit rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                                  Best payout
                                </span>
                              ) : null}
                              <p className="text-[13px] font-normal leading-relaxed text-muted-foreground">{option.demandNote}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top px-4 py-4 text-sm">
                            <div className="text-base font-medium leading-snug text-foreground">{option.marketplace}</div>
                            <button
                              type="button"
                              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                              onClick={() => setOpenedBreakdownIdx((prev) => (prev === i ? null : i))}
                              aria-expanded={openedBreakdownIdx === i}
                            >
                              {openedBreakdownIdx === i ? "Hide details" : "How we got these numbers"}
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openedBreakdownIdx === i && "rotate-180")} />
                            </button>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right align-top text-base tabular-nums">{formatMoney(option.estimatedSalePrice, option.currency)}</TableCell>
                          <TableCell className="px-4 py-4 text-right align-top text-base tabular-nums text-muted-foreground">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dotted underline-offset-2">
                                  −{formatMoney(friction, option.currency)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="space-y-1 text-xs font-sans">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Site fees</span>
                                  <span>−{formatMoney(option.estimatedFees, option.currency)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Shipping</span>
                                  <span>−{formatMoney(option.estimatedShipping, option.currency)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Tax or duty</span>
                                  <span>−{formatMoney(option.estimatedDuties, option.currency)}</span>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right align-top text-lg font-semibold tabular-nums">
                            {formatMoney(option.netToSeller, option.currency)}
                          </TableCell>
                          <TableCell className="px-4 py-4 pr-6 text-right align-top">
                            {postUrl ? (
                              <a
                                href={postUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/18"
                                data-testid={`arb-${i}-post-link`}
                              >
                                {PLATFORM_LABEL[slug!] ?? option.marketplace}
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-xs leading-snug text-muted-foreground">Add listing manually</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {openedBreakdownIdx === i && (
                          <TableRow className="border-t-0 bg-muted/20 hover:bg-muted/25">
                            <TableCell className="px-4 py-5 pl-6 pr-6 sm:px-6 sm:py-6" colSpan={6}>
                              <ArbitrageVenueFeeBreakdown
                                option={option}
                                comparablesAnchors={compAnchorsTop}
                                adjustedMidLabel={adjustedMidLabel}
                                sellerRegionLabel={sellerRegion}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
              <p className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                * Figures are estimated. Confirm fees and shipping on each marketplace before you rely on them.
              </p>
            </div>
          </section>
        )}


        {/* Similar sales */}
        {showExpandedPro && comparables.length > 0 && (
        <section className="space-y-6 print:break-inside-avoid">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Similar past sales</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Use these as reference points. We only show links we could verify. Buttons open a fresh search so you see what buyers are seeing now.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comparables.map((comp, i) => {
              const livePlatforms = [...new Set(platformsForAssetType(assetTypeName))];
              const searchQuery = `${estimateTitle} ${comp.description}`.slice(0, 90);
              const verifiedUrl = safeHttpUrl(comp.url);
              const saleYear = typeof comp.year === "number" && Number.isFinite(comp.year) ? comp.year : null;
              const isStaleSale = saleYear != null && saleYear < staleSaleBeforeYear;
              return (
                <Card key={i} className="flex flex-col overflow-hidden rounded-2xl border-border/50 bg-card shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{comp.source}</span>
                      {verifiedUrl ? (
                        <a
                          href={verifiedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold tabular-nums text-foreground underline-offset-2 transition-colors hover:text-accent hover:underline"
                          aria-label={`View source listing or sale record for ${fmt(comp.price)}`}
                          data-testid={`comp-${i}-price-link`}
                        >
                          {fmt(comp.price)}
                        </a>
                      ) : (
                        <span className="text-lg font-semibold tabular-nums">{fmt(comp.price)}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col p-4 pt-2">
                    <p className="line-clamp-3 text-sm leading-snug text-foreground">{comp.description}</p>
                    <div className="mb-3 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="tabular-nums">{saleYear != null ? `Sold ${saleYear}` : "Year unknown"}</span>
                      {isStaleSale ? (
                        <span className="rounded bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">Older sale</span>
                      ) : null}
                      {verifiedUrl ? (
                        <a
                          href={verifiedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                          data-testid={`comp-${i}-source-link`}
                        >
                          Open source link
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/80">No link for this row</span>
                      )}
                    </div>
                    <div className="mt-auto border-t border-border/40 pt-3">
                      <p className="mb-2 text-[11px] font-medium text-muted-foreground">Search what&apos;s listed now</p>
                      <div className="flex flex-wrap gap-1.5">
                        {livePlatforms.map((slug) => {
                          const url = platformSearchUrl(slug, searchQuery);
                          if (!url) return null;
                          return (
                            <a
                              key={slug}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-accent/35 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/18"
                              data-testid={`comp-${i}-platform-${slug}`}
                            >
                              {PLATFORM_LABEL[slug] ?? slug}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
        )}

        {/* Seller playbook – PRO ONLY (estimate must have been generated as pro) */}
        {showExpandedPro && proInsightsSanitized && (
        <section className="print:break-inside-avoid relative rounded-3xl border border-border/50 bg-card shadow-sm">
              <div className="border-b border-border/50 px-5 py-6 md:px-8 md:py-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent" aria-hidden>
                      <Lightbulb className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">If you&apos;re selling</p>
                      <h2 id="seller-playbook-heading" className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                        Tips for price, chats, and your listing
                      </h2>
                      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        Starter ask, floor amount, bargaining steps, pitfalls, listing ideas, and timing in one place.
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 self-start border-border/60 font-normal">
                    Full report only
                  </Badge>
                </div>
              </div>

              <div className="space-y-10 p-5 md:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-muted/15 p-5">
                    <p className="text-xs font-medium text-muted-foreground">Strong first price</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">{fmt(proInsightsSanitized.anchorPrice)}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      A reasonable opening number for your listing or first verbal ask. Buyers often expect some back and forth from here.
                    </p>
                  </div>
                  <div className="rounded-xl border border-destructive/25 bg-destructive/[0.04] p-5 dark:bg-destructive/[0.07]">
                    <p className="text-xs font-medium text-muted-foreground">Lowest worth accepting</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-destructive">{fmt(proInsightsSanitized.walkAwayPrice)}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Below this payout, pause or decline. Helps you avoid saying yes in the moment and regretting it later.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <Handshake className="h-4 w-4 text-accent shrink-0" aria-hidden />
                    <h4 className="text-base font-semibold">When someone bargains</h4>
                  </div>
                  <ol className="space-y-3">
                    {proInsightsSanitized.negotiationTactics.map((tactic, i) => (
                      <li
                        key={i}
                        className="flex gap-4 rounded-xl border border-border/50 bg-background/60 px-4 py-3.5 md:px-5 md:py-4"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-foreground ring-1 ring-border/70"
                          aria-hidden
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium leading-snug text-foreground">{tactic.title}</p>
                          <p className="text-sm leading-relaxed text-muted-foreground">{tactic.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-5 md:p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" aria-hidden />
                      <h4 className="text-base font-semibold text-foreground">Watch out for</h4>
                    </div>
                    <ul className="space-y-3">
                      {proInsightsSanitized.redFlags.map((flag, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/70" aria-hidden />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-5 md:p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-accent shrink-0" aria-hidden />
                      <h4 className="text-base font-semibold text-foreground">Make the listing clearer</h4>
                    </div>
                    <ul className="space-y-3">
                      {proInsightsSanitized.listingTips.map((tip, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" aria-hidden />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-5 rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-background p-5 md:flex-row md:items-center md:justify-between md:gap-8 md:p-6">
                  <div className="flex gap-4 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent"
                      aria-hidden
                    >
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <h4 className="text-base font-semibold text-foreground">Best window to list</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">{proInsightsSanitized.optimalTiming}</p>
                    </div>
                  </div>
                  <div className="shrink-0 space-y-2 md:max-w-xs md:text-right">
                    <Button
                      size="sm"
                      onClick={() => setListingOpen(true)}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 md:w-auto"
                      data-testid="when-to-sell-list-btn"
                    >
                      <Megaphone className="h-4 w-4 mr-2" aria-hidden /> Draft listing copy
                    </Button>
                    <p className="text-xs leading-snug text-muted-foreground md:text-right">
                      Uses this valuation to suggest wording you can paste into a marketplace.
                    </p>
                  </div>
                </div>
              </div>
        </section>
        )}

        {/* If user has Pro mode on but the estimate was generated as Free, prompt re-run */}
        {globalPro && estimate.tier === "free" && !estimate.proInsights && (
          <section className="mt-12 rounded-2xl border border-accent/35 bg-accent/10 px-4 py-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Pro preview is on, but this run was saved as a summary-only report.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run a fresh valuation while Pro is active to unlock seller tips and the extra sections.
                </p>
              </div>
            </div>
            <Link href="/estimate/new">
              <Button size="sm" className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground sm:mt-0">
                New full report
              </Button>
            </Link>
          </section>
        )}

        <footer className="mt-20 border-t border-border/60 pt-10 pb-12 text-center">
          {report.finalNarrative ? (
            <blockquote className="mx-auto mb-8 max-w-2xl text-pretty text-lg font-normal leading-relaxed text-foreground sm:text-xl">
              {report.finalNarrative}
            </blockquote>
          ) : null}
          <div className="mx-auto flex max-w-md flex-col gap-2 text-xs text-muted-foreground">
            <span className="text-sm font-medium text-foreground">ValYoued</span>
            <time dateTime={estimate.createdAt}>{formatDate(estimate.createdAt)}</time>
            <p className="mt-4 leading-relaxed">
              Estimate only, not formal advice. Pricing changes with the market.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
