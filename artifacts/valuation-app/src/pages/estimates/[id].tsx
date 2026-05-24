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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GenerateListingDialog } from "@/components/GenerateListingDialog";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PLATFORM_LABEL,
  PLATFORM_URL,
  matchPlatformSlug,
  platformComparableSearchUrl,
  platformsForAssetType,
} from "@/lib/platforms";
import { safeHttpUrl } from "@/lib/safe-url";

/** Free Everyday snapshots show this many comparable cards without a paid subscription. */
const FREE_COMP_GRID_PREVIEW = 2;

const SHOW_COMP_THUMBNAILS =
  import.meta.env.VITE_SHOW_COMP_THUMBNAILS === "1" ||
  import.meta.env.VITE_SHOW_COMP_THUMBNAILS === "true";

function compMatchTierLabel(t: Comparable["matchTier"] | undefined): string | null {
  if (t === "strong") return "Strong match";
  if (t === "moderate") return "Close match";
  if (t === "broadAnalogue") return "Broad analogue";
  return null;
}

function transactionGuessLabel(t: Comparable["transactionTypeGuess"] | undefined): string | null {
  if (t === "sold_estimate") return "Sold signal";
  if (t === "asking_price") return "Asking / listing";
  if (t === "unknown") return "Type unclear";
  return null;
}

/** Cost breakdown under each marketplace row. */
function ArbitrageVenueFeeBreakdown({
  option,
  adjustedMidLabel,
  sellerRegionLabel,
}: {
  option: ArbitrageOption;
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
    <div className="no-print space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3 text-sm md:p-4">
      <p className="font-medium text-foreground">Fee breakdown</p>
      <p className="text-xs text-muted-foreground leading-snug">
        From headline estimate{" "}
        <span className="tabular-nums font-medium text-foreground">{adjustedMidLabel}</span> on{" "}
        <span className="font-medium text-foreground">{option.marketplace}</span> ({option.region}), after typical friction.
      </p>

      <div className="grid gap-2 rounded-lg bg-background/80 p-2.5 text-xs sm:grid-cols-2">
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

      <blockquote className="rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Demand:</span> {option.demandNote}
      </blockquote>

      <dl className="grid gap-1.5 rounded-lg border border-border/50 bg-card/90 p-2.5 text-xs tabular-nums md:text-sm">
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

      <p className="text-[11px] leading-snug text-muted-foreground">
        Rounded.{!tallyOk ? " Small gaps are usually rounding." : ""} Confirm on the marketplace and with your courier.
      </p>
    </div>
  );
}

export default function EstimateReportPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: billing } = useBillingSummary();
  const billingPaid = Boolean(billing?.hasPaidValuationTier);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [listingOpen, setListingOpen] = useState(false);
  const [intentCoachOpen, setIntentCoachOpen] = useState(false);
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

  function commitIntentFromCoach(intent: "hold" | "monitor" | "sell") {
    if (!estimate) return;
    patchIntent.mutate(
      { id: estimate.id, data: { intent } },
      {
        onSuccess: () => {
          setIntentCoachOpen(false);
          if (intent === "sell") setListingOpen(true);
        },
      },
    );
  }

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

  useEffect(() => {
    if (!estimate || estimate.intent) return;
    try {
      const key = `valyoued.firstIntentCoach.${estimate.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      const timer = window.setTimeout(() => setIntentCoachOpen(true), 450);
      return () => window.clearTimeout(timer);
    } catch {
      const timer = window.setTimeout(() => setIntentCoachOpen(true), 450);
      return () => window.clearTimeout(timer);
    }
  }, [estimate]);

  const proInsightsSanitized = useMemo(() => {
    if (!estimate?.proInsights) return null;
    const { optimalTiming: _unusedOptimalTiming, ...p } = estimate.proInsights;
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

  // Full detail: active paid valuation tier (Stripe) or this row was persisted as Pro at generation time.
  const showExpandedPro = billingPaid || estimate.tier === "pro";
  const reportBadgePro = showExpandedPro;

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
  };

  const arbitrageRows = estimate.arbitrage ?? [];
  const comparables = estimate.comparables ?? [];
  const visibleComps =
    showExpandedPro ? comparables : comparables.slice(0, Math.min(FREE_COMP_GRID_PREVIEW, comparables.length));
  const lockedCompCount = Math.max(0, comparables.length - visibleComps.length);
  const currentYear = new Date().getFullYear();
  const staleSaleBeforeYear = currentYear - 3;
  const fmt = (v: number, compact = false) => formatMoney(v, ccy, compact);
  const adjustedMidLabel = fmt(estimate.adjustedMid);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-2 print:max-w-none print:px-0 print:pb-0 sm:px-6">
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      <AlertDialog open={intentCoachOpen} onOpenChange={setIntentCoachOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>What&apos;s next for this item?</AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-relaxed">
              <strong className="font-medium text-foreground">Hold</strong> saves a quiet baseline.{" "}
              <strong className="font-medium text-foreground">Monitor</strong> keeps it on your watch list for value prompts on your plan.{" "}
              <strong className="font-medium text-foreground">Sell</strong> opens a listing draft wired to this valuation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-col sm:space-x-0">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={patchIntent.isPending}
                onClick={() => commitIntentFromCoach("hold")}
              >
                Hold
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={patchIntent.isPending}
                onClick={() => commitIntentFromCoach("monitor")}
              >
                Monitor
              </Button>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
                disabled={patchIntent.isPending}
                onClick={() => commitIntentFromCoach("sell")}
              >
                Sell
              </Button>
            </div>
            <AlertDialogCancel className="w-full sm:w-auto" disabled={patchIntent.isPending}>
              Decide later
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="mb-8 space-y-5 print:break-inside-avoid">
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
            <p className="max-w-2xl text-sm leading-snug text-muted-foreground sm:text-base">{report.summary}</p>
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

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm print:border-border print:shadow-none">
          <div className="border-b border-border/50 bg-gradient-to-br from-accent/[0.07] via-transparent to-transparent px-4 py-4 sm:px-5">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Estimate today</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">{fmt(estimate.adjustedMid)}</p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Likely band {fmt(estimate.adjustedLow, true)} to {fmt(estimate.adjustedHigh, true)}
            </p>
            {uplift !== 0 ? (
              <p
                className={cn(
                  "mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium sm:text-xs",
                  uplift > 0
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400",
                )}
              >
                {uplift > 0 ? "Up" : "Down"} about {formatPercent(Math.abs(uplift))} vs sales-only view
              </p>
            ) : null}
            {report.marketNarrative ? (
              <p className="mt-2 max-w-2xl text-xs leading-snug text-foreground/85 sm:text-sm">{report.marketNarrative}</p>
            ) : null}
          </div>
          <div className="border-t border-border/50 px-4 py-4 sm:px-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">From similar sales</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{fmt(estimate.baselineMid)}</span>
              <span className="text-[11px] text-muted-foreground sm:text-xs">
                Range {fmt(estimate.baselineLow, true)} to {fmt(estimate.baselineHigh, true)}
              </span>
            </div>
            {report.baselineNarrative ? (
              <p className="mt-2 text-xs leading-snug text-muted-foreground sm:text-sm">{report.baselineNarrative}</p>
            ) : null}
            <p className="mt-3 border-l-2 border-accent/25 pl-3 text-[11px] leading-snug text-muted-foreground sm:text-xs">
              The headline layers news and demand on similar sales. Use the range when you talk price.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-8 md:space-y-10">
        {!showExpandedPro && (
          <section className="print-break-inside-avoid rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    See the full picture
                  </h2>
                  <p className="max-w-xl text-sm leading-snug text-muted-foreground">
                    Subscribe for news, payouts by venue, the full comparable grid, and the seller playbook. This summary
                    stays here until billing is active or you open a valuation generated on Pro.
                    {comparables.length > 0 ? (
                      <>
                        {" "}
                        Comparable evidence still appears below so you can sanity-check similar sales.
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 md:items-end">
                <Link href="/settings">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Upgrade in settings</Button>
                </Link>
                <p className="text-xs text-muted-foreground md:text-right">Everyday+ or Professional</p>
              </div>
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                { icon: Clock, text: "Good times to list" },
                { icon: Newspaper, text: "How headlines might change your price" },
                { icon: Globe2, text: isMobile ? "Where abroad might pay more" : "Where local buyers shop most" },
                { icon: Scale, text: "Similar sales you can point to" },
                { icon: Target, text: "Prices to open with and walk away from" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-2.5 py-2 text-sm">
                  <f.icon className="h-4 w-4 shrink-0 text-accent" />
                  <span className="text-foreground/90">{f.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* World Events – PRO ONLY */}
        {showExpandedPro && estimate.worldEvents && estimate.worldEvents.length > 0 && (
          <section className="space-y-4 print:break-inside-avoid">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">News that may tilt the price</h2>
              {report.worldEventsNarrative ? (
                <p className="max-w-2xl text-sm leading-snug text-muted-foreground">{report.worldEventsNarrative}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
                  <article key={i} className={`rounded-xl border p-4 ${tone}`}>
                    <div className="flex items-start gap-2.5">
                      <CircleDot className={`mt-0.5 h-4 w-4 shrink-0 ${dot}`} aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold leading-snug text-foreground">{stripQ(ev.title)}</h3>
                          {ev.scope ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">{ev.scope}</span>
                          ) : null}
                        </div>
                        <p className="text-sm leading-snug text-muted-foreground">{stripQ(ev.summary)}</p>
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

        {/* Where listing might pay best: same tier preview gate as other full-report sections */}
        {showExpandedPro && arbitrageRows.length > 0 && (
          <section className="space-y-4 print:break-inside-avoid">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {isMobile ? "Where listing might pay best" : "Local sites and payouts"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
                Estimated list price minus fees, shipping, and duties. Expand a row for the breakdown.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/50 bg-card shadow-sm">
              <Table className="min-w-[58rem] w-full table-fixed lg:min-w-full">
                <TableHeader className="border-b border-border/50 bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[26%] min-w-[13rem] whitespace-normal px-4 py-3 pl-5 text-left text-sm font-medium text-foreground first:rounded-tl-xl">
                      Place
                    </TableHead>
                    <TableHead className="w-[22%] min-w-[12rem] whitespace-normal px-4 py-3 text-left text-sm font-medium text-foreground">
                      Site
                    </TableHead>
                    <TableHead className="w-[12%] min-w-[7.5rem] whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">
                      List price
                    </TableHead>
                    <TableHead className="w-[14%] min-w-[8.5rem] whitespace-normal px-4 py-3 text-right text-sm text-muted-foreground">
                      Costs
                      <div className="mt-0.5 text-[11px] font-normal normal-case leading-snug text-muted-foreground/80">
                        Fees, ship, duty
                      </div>
                    </TableHead>
                    <TableHead className="w-[12%] min-w-[7.5rem] whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-foreground">
                      You keep
                    </TableHead>
                    <TableHead className="w-[14%] min-w-[10.5rem] whitespace-nowrap px-4 py-3 pr-5 text-right text-sm font-medium last:rounded-tr-xl">
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
                          <TableCell className="align-top px-4 py-3 pl-5 text-sm font-medium leading-snug">
                            <div className="flex max-w-none flex-col gap-1.5">
                              <span className="text-[15px] font-semibold text-foreground">{option.region}</span>
                              {option.recommended ? (
                                <span className="inline-flex w-fit rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                                  Best payout
                                </span>
                              ) : null}
                              <p className="text-xs font-normal leading-snug text-muted-foreground">{option.demandNote}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top px-4 py-3 text-sm">
                            <div className="text-[15px] font-medium leading-snug text-foreground">{option.marketplace}</div>
                            <button
                              type="button"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                              onClick={() => setOpenedBreakdownIdx((prev) => (prev === i ? null : i))}
                              aria-expanded={openedBreakdownIdx === i}
                            >
                              {openedBreakdownIdx === i ? "Hide details" : "Breakdown"}
                              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openedBreakdownIdx === i && "rotate-180")} />
                            </button>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right align-top text-sm tabular-nums">{formatMoney(option.estimatedSalePrice, option.currency)}</TableCell>
                          <TableCell className="px-4 py-3 text-right align-top text-sm tabular-nums text-muted-foreground">
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
                          <TableCell className="px-4 py-3 text-right align-top text-base font-semibold tabular-nums">
                            {formatMoney(option.netToSeller, option.currency)}
                          </TableCell>
                          <TableCell className="px-4 py-3 pr-5 text-right align-top">
                            {postUrl ? (
                              <a
                                href={postUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/35 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/18"
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
                            <TableCell className="px-4 py-4 pl-5 pr-4 sm:px-5 sm:py-4" colSpan={6}>
                              <ArbitrageVenueFeeBreakdown
                                option={option}
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
          </section>
        )}


        {/* Similar sales */}
        {comparables.length > 0 ? (
          <section className="space-y-4 print:break-inside-avoid">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Similar sales and why they matter</h2>
              <p className="max-w-2xl text-sm leading-snug text-muted-foreground">
                Each row ties back to your wizard notes. Open permalinks when present, or jump to sold and live searches on
                the marketplaces we cover.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your item</p>
                <p className="mt-1 font-medium text-foreground">{estimateTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Condition {estimate.input?.condition != null ? `${estimate.input.condition}/10` : "n/a"}
                  {sellerRegion ? ` · ${sellerRegion}` : ""}
                </p>
                {estimate.input?.attributes ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-snug text-muted-foreground">{estimate.input.attributes}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add richer attributes on the next valuation to sharpen how comps line up.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border/50 bg-card/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence context</p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  Strong matches align on condition and specs. Broad analogues are still useful for direction but should not
                  be read as identical sales.
                </p>
              </div>
            </div>

            {lockedCompCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-accent/30 bg-accent/[0.06] px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Showing {visibleComps.length} of {comparables.length} comparable rows on this snapshot. Unlock the full
                  grid with Everyday+.
                </span>
                <Link href="/settings" className="shrink-0 text-sm font-medium text-accent hover:underline">
                  Upgrade in settings
                </Link>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleComps.map((comp, i) => {
              const livePlatforms = [...new Set(platformsForAssetType(assetTypeName))];
              const searchQuery = `${estimateTitle} ${comp.description}`.slice(0, 90);
              const platformSearchContext = {
                currency: ccy,
                sellerRegion: estimate.input?.currentRegion ?? null,
              };
              const hasSoldShortcut = livePlatforms.some(
                (slug) =>
                  platformComparableSearchUrl(slug, searchQuery, {
                    intent: "sold",
                    context: platformSearchContext,
                  }) != null,
              );
              const verifiedUrl = safeHttpUrl(comp.url);
              const thumbUrl = SHOW_COMP_THUMBNAILS ? safeHttpUrl(comp.imageUrl) : undefined;
              const saleYear = typeof comp.year === "number" && Number.isFinite(comp.year) ? comp.year : null;
              const isStaleSale = saleYear != null && saleYear < staleSaleBeforeYear;
              const matchTier = compMatchTierLabel(comp.matchTier);
              const txGuess = transactionGuessLabel(comp.transactionTypeGuess);
              return (
                <Card key={`${comp.source}-${comp.price}-${i}`} className="flex flex-col overflow-hidden rounded-2xl border-border/50 bg-card shadow-sm">
                  {thumbUrl ? (
                    <div className="relative h-36 w-full overflow-hidden bg-muted/40">
                      <img
                        src={thumbUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : null}
                  <CardHeader className="p-4 pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{comp.source}</span>
                        {matchTier ? (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {matchTier}
                          </Badge>
                        ) : null}
                        {txGuess ? (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {txGuess}
                          </Badge>
                        ) : null}
                      </div>
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
                    {comp.relevanceExplanation ? (
                      <p className="mt-2 text-xs font-medium leading-snug text-accent">{stripQ(comp.relevanceExplanation)}</p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col p-4 pt-0">
                    <p className="line-clamp-3 text-sm leading-snug text-foreground">{stripQ(comp.description)}</p>
                    <div className="mb-2 mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      {comp.conditionCue ? <span className="rounded bg-muted/60 px-1.5 py-0.5">{stripQ(comp.conditionCue)}</span> : null}
                      {comp.locationOrChannel ? <span className="rounded bg-muted/60 px-1.5 py-0.5">{stripQ(comp.locationOrChannel)}</span> : null}
                      <span className="tabular-nums">{saleYear != null ? `Sale year ${saleYear}` : "Year unknown"}</span>
                      {isStaleSale ? (
                        <span className="rounded bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">Older row</span>
                      ) : null}
                    </div>
                    <div className="mb-3 mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                        <span className="text-muted-foreground/80">No permalink for this row</span>
                      )}
                    </div>
                    <div className="mt-auto space-y-2 border-t border-border/40 pt-2">
                      <div>
                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Similar sold listings</p>
                        <div className="flex flex-wrap gap-1.5">
                          {livePlatforms.map((slug) => {
                            const url = platformComparableSearchUrl(slug, searchQuery, {
                              intent: "sold",
                              context: platformSearchContext,
                            });
                            if (!url) return null;
                            return (
                              <a
                                key={`${slug}-sold`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-accent/35 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/18"
                                aria-label={`Search completed and sold listings on ${PLATFORM_LABEL[slug] ?? slug}`}
                                data-testid={`comp-${i}-platform-${slug}-sold`}
                              >
                                {PLATFORM_LABEL[slug] ?? slug}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            );
                          })}
                        </div>
                        {!hasSoldShortcut ? (
                          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                            Sold search on eBay when available; otherwise try live listings or the source link.
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Browse live listings</p>
                        <div className="flex flex-wrap gap-1.5">
                          {livePlatforms.map((slug) => {
                            const url = platformComparableSearchUrl(slug, searchQuery, {
                              intent: "live",
                            });
                            if (!url) return null;
                            return (
                              <a
                                key={`${slug}-live`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50"
                                aria-label={`Search live listings on ${PLATFORM_LABEL[slug] ?? slug}`}
                                data-testid={`comp-${i}-platform-${slug}-live`}
                              >
                                {PLATFORM_LABEL[slug] ?? slug}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          </section>
        ) : null}

        {/* Seller playbook – PRO ONLY (estimate must have been generated as pro) */}
        {showExpandedPro && proInsightsSanitized && (
          <section className="print:break-inside-avoid relative rounded-2xl border border-border/50 bg-card shadow-sm">
            <div className="border-b border-border/50 px-4 py-4 md:px-6 md:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden>
                    <Lightbulb className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">If you&apos;re selling</p>
                    <h2 id="seller-playbook-heading" className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                      Price, chats, listing
                    </h2>
                    <p className="max-w-xl text-sm leading-snug text-muted-foreground">
                      Opening ask, walk-away floor, negotiation steps, pitfalls, and listing tweaks.
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 self-start border-border/60 font-normal">
                  Full report only
                </Badge>
              </div>
            </div>

            <div className="space-y-6 p-4 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-muted/15 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Strong first price</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">{fmt(proInsightsSanitized.anchorPrice)}</p>
                    <p className="mt-2 text-xs leading-snug text-muted-foreground">Reasonable opening ask before typical haggling.</p>
                  </div>
                  <div className="rounded-lg border border-destructive/25 bg-destructive/[0.04] p-4 dark:bg-destructive/[0.07]">
                    <p className="text-xs font-medium text-muted-foreground">Lowest worth accepting</p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-destructive">{fmt(proInsightsSanitized.walkAwayPrice)}</p>
                    <p className="mt-2 text-xs leading-snug text-muted-foreground">Below this, pause or walk away.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-foreground">
                    <Handshake className="h-4 w-4 text-accent shrink-0" aria-hidden />
                    <h4 className="text-base font-semibold">When someone bargains</h4>
                  </div>
                  <ol className="space-y-2">
                    {proInsightsSanitized.negotiationTactics.map((tactic, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 md:px-4 md:py-3"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-foreground ring-1 ring-border/70"
                          aria-hidden
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium leading-snug text-foreground">{tactic.title}</p>
                          <p className="text-sm leading-snug text-muted-foreground">{tactic.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

              <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4 md:p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" aria-hidden />
                      <h4 className="text-base font-semibold text-foreground">Watch out for</h4>
                    </div>
                    <ul className="space-y-2">
                      {proInsightsSanitized.redFlags.map((flag, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-snug text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/70" aria-hidden />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4 md:p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-accent shrink-0" aria-hidden />
                      <h4 className="text-base font-semibold text-foreground">Make the listing clearer</h4>
                    </div>
                    <ul className="space-y-2">
                      {proInsightsSanitized.listingTips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-snug text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" aria-hidden />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
            </div>
          </section>
        )}

        {/* Paid account but snapshot predates Pro / playbook not stored on this row */}
        {billingPaid && estimate.tier === "free" && !estimate.proInsights && (
          <section className="mt-12 rounded-2xl border border-accent/35 bg-accent/10 px-4 py-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Your subscription is active, but this report was saved as a free-tier run.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run a new valuation now to persist seller playbook and full detail on the row.
                </p>
              </div>
            </div>
            <Link href="/estimate/new">
              <Button size="sm" className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground sm:mt-0">
                New valuation
              </Button>
            </Link>
          </section>
        )}

        <p className="mt-8 border-t border-border/60 pt-5 text-center text-xs text-muted-foreground">
          Estimate only, not formal advice. Pricing changes with the market.
        </p>
      </div>
    </div>
  );
}
