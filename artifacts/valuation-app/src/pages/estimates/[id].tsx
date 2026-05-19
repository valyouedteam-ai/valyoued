import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetEstimate, getGetEstimateQueryKey, usePatchEstimate } from "@workspace/api-client-react";
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
  Zap,
  Target,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Newspaper,
  CircleDot,
  Sparkles,
  Clock,
  Megaphone,
} from "lucide-react";
import { useProTier } from "@/hooks/use-pro-tier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GenerateListingDialog } from "@/components/GenerateListingDialog";
import {
  PLATFORM_LABEL,
  PLATFORM_URL,
  matchPlatformSlug,
  platformSearchUrl,
  platformsForAssetType,
} from "@/lib/platforms";
import { safeHttpUrl } from "@/lib/safe-url";
import { ExternalLink } from "lucide-react";

export default function EstimateReportPage() {
  const params = useParams();
  const id = params.id as string;
  const { isPro: globalPro } = useProTier();
  const queryClient = useQueryClient();
  const [listingOpen, setListingOpen] = useState(false);

  const patchIntent = usePatchEstimate({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getGetEstimateQueryKey(id) }),
    },
  });

  const { data: estimate, isLoading } = useGetEstimate(id, {
    query: { enabled: !!id, queryKey: getGetEstimateQueryKey(id) },
  });

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
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded"></div>
        <div className="h-16 w-3/4 bg-muted rounded mt-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="h-48 bg-muted rounded"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
        <div className="h-64 bg-muted rounded mt-8"></div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-xl bg-card/30 max-w-3xl mx-auto mt-12">
        <h3 className="text-xl font-sans mb-2">Report Not Found</h3>
        <p className="text-muted-foreground mb-6">This estimate does not exist or you do not have access.</p>
        <Link href="/estimates">
          <Button variant="outline">Back to Estimates</Button>
        </Link>
      </div>
    );
  }

  // What was saved with this estimate (API / billing). Expanded Pro follows saved tier or current subscription.
  const savedTierPro = estimate.tier === "pro";
  const showExpandedPro = savedTierPro || globalPro;

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

  return (
    <div className="max-w-5xl mx-auto pb-24 print:pb-0">
      <div className="no-print flex items-center justify-between mb-8 gap-2 flex-wrap">
        <Link href="/estimates">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setListingOpen(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="report-list-btn"
          >
            <Megaphone className="h-4 w-4 mr-2" /> Generate listing ad
          </Button>
        </div>
      </div>

      <GenerateListingDialog
        estimateId={estimateIdResolved}
        estimateTitle={estimateTitle}
        assetTypeName={assetTypeName}
        open={listingOpen}
        onOpenChange={setListingOpen}
      />

      <section className="no-print mb-8">
        <Card className="border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-sans">Plans for this asset</CardTitle>
            <CardDescription>
              Tell us whether you&apos;re holding, watching value changes, or ready to draft a listing — we steer reminders and
              tools from this intent.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(["hold", "monitor", "sell"] as const).map((intent) => (
              <Button
                key={intent}
                type="button"
                size="sm"
                variant={estimate.intent === intent ? "default" : "outline"}
                disabled={patchIntent.isPending}
                onClick={() => {
                  patchIntent.mutate(
                    { id, data: { intent } },
                    {
                      onSuccess: () => {
                        if (intent === "sell") setListingOpen(true);
                      },
                    },
                  );
                }}
              >
                {intent === "hold" ? "Hold" : intent === "monitor" ? "Monitor value" : "Prep to sell"}
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <header className="space-y-6 mb-12">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="font-sans bg-background px-3 py-1 text-xs tracking-widest uppercase border-border/50 shadow-sm">
            {assetTypeName}
          </Badge>
          <Badge
            variant={savedTierPro ? "default" : "secondary"}
            className={`font-sans px-3 py-1 text-xs tracking-widest uppercase shadow-sm ${
              savedTierPro ? "bg-accent hover:bg-accent text-accent-foreground" : ""
            }`}
          >
            {savedTierPro ? "PRO REPORT" : "FREE REPORT"}
          </Badge>
          <Badge variant="outline" className="font-sans px-3 py-1 text-xs tracking-widest border-border/50">
            {sellerRegion ? `${sellerRegion} · ${ccy}` : ccy}
          </Badge>
          <span className="text-xs text-muted-foreground font-sans">{formatDate(estimate.createdAt)}</span>
        </div>

        <div>
          <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground leading-tight">
            {report.headline}
          </h1>
          <p className="text-xl text-muted-foreground mt-4 max-w-3xl font-sans italic">{report.summary}</p>
        </div>
      </header>

      <div className="space-y-12">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/50 shadow-sm bg-card/50 overflow-hidden print-break-inside-avoid">
            <div className="h-1.5 w-full bg-border"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-sans flex items-center gap-2">
                <Scale className="h-5 w-5 text-muted-foreground" />
                Baseline Valuation
              </CardTitle>
              <CardDescription>Based on comparable sales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-sans font-bold tracking-tight text-foreground">{fmt(estimate.baselineMid)}</div>
              <div className="text-sm text-muted-foreground mt-2 font-sans">
                Range: {fmt(estimate.baselineLow, true)} – {fmt(estimate.baselineHigh, true)}
              </div>
              <p className="text-sm mt-4 text-foreground/80 leading-relaxed border-t border-border/50 pt-4">
                {report.baselineNarrative}
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/30 shadow-md bg-card overflow-hidden print-break-inside-avoid">
            <div className="h-1.5 w-full bg-accent"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-sans flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Market Adjusted
                </div>
                <Badge
                  variant="outline"
                  className={`font-sans text-xs ${
                    uplift > 0
                      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900"
                      : uplift < 0
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                      : "bg-muted"
                  }`}
                >
                  {uplift > 0 ? "+" : ""}
                  {formatPercent(uplift)} from signals
                </Badge>
              </CardTitle>
              <CardDescription>Current real-time pricing power</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-sans font-bold tracking-tight text-foreground">{fmt(estimate.adjustedMid)}</div>
              <div className="text-sm text-muted-foreground mt-2 font-sans">
                Range: {fmt(estimate.adjustedLow, true)} – {fmt(estimate.adjustedHigh, true)}
              </div>
              <p className="text-sm mt-4 text-foreground/80 leading-relaxed border-t border-border/50 pt-4">
                {report.marketNarrative}
              </p>
            </CardContent>
          </Card>
        </section>

        {!showExpandedPro && (
          <section className="print-break-inside-avoid">
            <Card className="relative overflow-hidden border-accent/40 bg-gradient-to-br from-card via-card to-accent/5 shadow-lg">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-chart-2/10 blur-3xl pointer-events-none" />
              <CardHeader className="relative">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shadow-md glow-accent shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-sans font-semibold">
                      {savedTierPro ? (
                        <>
                          Pro detail hidden. Turn on <span className="brand-gradient">Pro preview</span>
                        </>
                      ) : (
                        <>
                          Unlock the full <span className="brand-gradient">Pro Report</span>
                        </>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      {savedTierPro
                        ? "The header Pro toggle is off. Switch it on to show world events, comparables, and execution strategy for this report."
                        : "You're seeing the headline price. Pro adds everything you need to actually sell well."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {!savedTierPro ? (
              <CardContent className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {[
                    { icon: Clock, label: "When to sell", desc: "Optimal timing window for your market" },
                    { icon: Newspaper, label: "World events impact", desc: "Live news + how each story moves your price" },
                    { icon: Globe2, label: isMobile ? "International arbitrage" : "Local market analysis", desc: isMobile ? "Best country & marketplace to net the most" : "Best local marketplace, fees & buyer pool" },
                    { icon: Scale, label: "Verified comparables", desc: "Recent sold prices that ground the estimate" },
                    { icon: Target, label: "Anchor & walk-away prices", desc: "Negotiation tactics, red flags, listing tips" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/40">
                      <f.icon className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{f.label}</div>
                        <div className="text-xs text-muted-foreground leading-snug">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/settings">
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg glow-accent w-full sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Unlock with Everyday+ or Professional
                  </Button>
                </Link>
                <p className="text-[11px] text-muted-foreground font-sans mt-3 uppercase tracking-wider">
                  Subscription-backed · upgrade in billing settings
                </p>
              </CardContent>
              ) : null}
            </Card>
          </section>
        )}

        {/* World Events – PRO ONLY */}
        {showExpandedPro && estimate.worldEvents && estimate.worldEvents.length > 0 && (
          <section className="space-y-4 print-break-inside-avoid">
            <div>
              <h3 className="text-xl font-sans flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-muted-foreground" /> World Events Impact
              </h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{report.worldEventsNarrative}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {estimate.worldEvents.map((ev, i) => {
                const tone =
                  ev.sentiment === "positive"
                    ? "border-green-500/40 bg-green-500/5"
                    : ev.sentiment === "negative"
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-border bg-card/50";
                const dot =
                  ev.sentiment === "positive"
                    ? "text-green-600 dark:text-green-400"
                    : ev.sentiment === "negative"
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground";
                return (
                  <Card key={i} className={`shadow-sm ${tone}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-sans leading-snug flex items-start gap-2">
                          <CircleDot className={`h-4 w-4 mt-1 shrink-0 ${dot}`} />
                          {stripQ(ev.title)}
                        </CardTitle>
                        <Badge variant="outline" className="font-sans text-[10px] uppercase shrink-0">
                          {ev.scope}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground/80 leading-relaxed">{stripQ(ev.summary)}</p>
                      {(ev.source || ev.url || ev.publishedAt) && (
                        <div className="text-xs text-muted-foreground mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {ev.source && <span className="font-sans uppercase tracking-wider">{ev.source}</span>}
                          {ev.publishedAt && (
                            <>
                              {ev.source && <span className="opacity-50">·</span>}
                              <span className="font-sans">
                                {(() => {
                                  const d = new Date(ev.publishedAt);
                                  return isNaN(d.getTime())
                                    ? ev.publishedAt
                                    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                                })()}
                              </span>
                            </>
                          )}
                          {ev.url && (
                            <a href={ev.url} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center ml-auto">
                              Read <ChevronRight className="h-3 w-3 ml-0.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Arbitrage – PRO ONLY */}
        {showExpandedPro && (
        <section className="space-y-4 print-break-inside-avoid">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-sans flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-muted-foreground" />
              {isMobile ? "International Arbitrage" : "Local Market"}
            </h3>
            {!isMobile && (
              <Badge variant="outline" className="font-sans text-[10px] uppercase tracking-widest">
                Local-only asset
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2 max-w-3xl">{report.arbitrageNarrative}</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-3xl italic">
            Friction includes marketplace fees, insured cross-border shipping, and import duties / VAT, so "Net to Seller" is what actually lands in your account.
          </p>

          <div className="border border-border/50 rounded-lg overflow-hidden bg-card/30">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[140px]">Region</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right text-muted-foreground">
                    Friction
                    <div className="text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70">
                      Fees · Ship+Insurance · Duty
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold text-foreground">Net to Seller</TableHead>
                  <TableHead className="w-[120px] text-right">List here</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arbitrageRows.map((option, i) => {
                  const friction = option.estimatedFees + option.estimatedShipping + option.estimatedDuties;
                  const slug = matchPlatformSlug(option.marketplace);
                  const postUrl = slug ? PLATFORM_URL[slug] : null;
                  return (
                    <TableRow key={i} className={option.recommended ? "bg-accent/5 hover:bg-accent/10" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {option.region}
                          {option.recommended && (
                            <Badge variant="default" className="bg-accent hover:bg-accent text-accent-foreground text-[10px] px-1.5 py-0 uppercase tracking-wider">
                              Best
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{option.marketplace}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{option.demandNote}</div>
                      </TableCell>
                      <TableCell className="text-right font-sans">{formatMoney(option.estimatedSalePrice, option.currency)}</TableCell>
                      <TableCell className="text-right font-sans text-muted-foreground text-xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted underline-offset-2">
                              -{formatMoney(friction, option.currency)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs space-y-1 font-sans">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Marketplace fees</span>
                              <span>-{formatMoney(option.estimatedFees, option.currency)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Shipping + insurance</span>
                              <span>-{formatMoney(option.estimatedShipping, option.currency)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Import duties / VAT</span>
                              <span>-{formatMoney(option.estimatedDuties, option.currency)}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right font-sans font-bold text-base">{formatMoney(option.netToSeller, option.currency)}</TableCell>
                      <TableCell className="text-right">
                        {postUrl ? (
                          <a
                            href={postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 transition-colors"
                            data-testid={`arb-${i}-post-link`}
                          >
                            List on {PLATFORM_LABEL[slug!] ?? option.marketplace}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic">Manual listing</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
        )}

        {/* Comparables – PRO ONLY */}
        {showExpandedPro && comparables.length > 0 && (
        <section className="space-y-4 print-break-inside-avoid">
          <h3 className="text-xl font-sans">Recent Sales &amp; Live Listings</h3>
          <p className="text-sm text-muted-foreground max-w-3xl -mt-2">
            Comparable sales aim at the last year or two. When the model supplies a real web address, we show an
            &quot;Open verified source&quot; link (unsafe or made-up URLs are removed). Use the marketplace buttons
            to run a fresh search, including Facebook Marketplace, for what is listed today.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparables.map((comp, i) => {
              const livePlatforms = [...new Set(platformsForAssetType(assetTypeName))];
              const searchQuery = `${estimateTitle} ${comp.description}`.slice(0, 90);
              const verifiedUrl = safeHttpUrl(comp.url);
              const saleYear = typeof comp.year === "number" && Number.isFinite(comp.year) ? comp.year : null;
              const isStaleSale = saleYear != null && saleYear < staleSaleBeforeYear;
              return (
                <Card key={i} className="bg-card/50 border-border/50 shadow-sm flex flex-col">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-sans shrink-0">
                        {comp.source}
                      </Badge>
                      <span className="font-sans font-bold tabular-nums">{fmt(comp.price)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex-1 flex flex-col">
                    <p className="text-sm font-medium line-clamp-3 mb-2">{comp.description}</p>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
                      <span className="inline-flex items-center gap-1.5">
                        Sale year {saleYear ?? "—"}
                        {isStaleSale ? (
                          <Badge variant="secondary" className="text-[9px] font-normal uppercase tracking-wide">
                            Older sale
                          </Badge>
                        ) : null}
                      </span>
                      {verifiedUrl ? (
                        <a
                          href={verifiedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                          data-testid={`comp-${i}-source-link`}
                        >
                          Open verified source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] italic">No direct link for this row</span>
                      )}
                    </div>
                    <div className="mt-auto pt-3 border-t border-border/40">
                      <div className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground mb-2">
                        Search live listings
                      </div>
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
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 transition-colors"
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

        {/* Pro Execution Strategy – PRO ONLY (estimate must have been generated as pro) */}
        {showExpandedPro && proInsightsSanitized && (
        <section className="mt-16 print-break-inside-avoid relative">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 md:p-8 space-y-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-accent/20 pb-4">
                <div className="p-2 bg-accent text-accent-foreground rounded-md shadow-sm">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-sans font-bold text-foreground">Pro Execution Strategy</h3>
                  <p className="text-sm text-muted-foreground font-sans mt-1">TACTICAL DIRECTIVES FOR MAXIMUM YIELD</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <Target className="h-4 w-4 text-accent" /> Negotiation Tactics
                    </h4>
                    <div className="space-y-4">
                      {proInsightsSanitized.negotiationTactics.map((tactic, i) => (
                        <div key={i} className="bg-card border border-border/50 rounded-lg p-4 shadow-sm">
                          <h5 className="font-bold text-foreground mb-1">{tactic.title}</h5>
                          <p className="text-sm text-foreground/80 leading-relaxed">{tactic.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" /> Red Flags
                      </h4>
                      <ul className="space-y-2">
                        {proInsightsSanitized.redFlags.map((flag, i) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="text-destructive mt-0.5">•</span> {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" /> Listing Tips
                      </h4>
                      <ul className="space-y-2">
                        {proInsightsSanitized.listingTips.map((tip, i) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="text-accent mt-0.5">•</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="border-accent/40 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Anchor Price</CardTitle>
                      <CardDescription>Initial listing or ask</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-sans font-bold text-accent">{fmt(proInsightsSanitized.anchorPrice)}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive/40 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Walk-Away Price</CardTitle>
                      <CardDescription>Absolute minimum acceptable</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-sans font-bold text-destructive">{fmt(proInsightsSanitized.walkAwayPrice)}</div>
                    </CardContent>
                  </Card>

                  <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-accent" /> When to Sell
                    </h4>
                    <p className="text-sm font-medium">{proInsightsSanitized.optimalTiming}</p>
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-xs text-muted-foreground mb-2">
                        Ready to list it now? Generate a marketplace-ready ad in seconds.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setListingOpen(true)}
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                        data-testid="when-to-sell-list-btn"
                      >
                        <Megaphone className="h-4 w-4 mr-2" /> Generate listing ad
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>
        )}

        {/* If user has Pro mode on but the estimate was generated as Free, prompt re-run */}
        {globalPro && estimate.tier === "free" && !estimate.proInsights && (
          <section className="mt-8 print-break-inside-avoid">
            <Card className="border-accent/40 bg-accent/5">
              <CardContent className="py-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-accent shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">Pro Mode is on, but this report was generated on Free</div>
                    <div className="text-xs text-muted-foreground">Run a new valuation to get negotiation tactics, anchor & walk-away prices.</div>
                  </div>
                </div>
                <Link href="/estimate/new">
                  <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    Run new Pro valuation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        )}

        <div className="pt-12 border-t border-border mt-16 text-center pb-8">
          <p className="font-sans italic text-xl text-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
            {report.finalNarrative}
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/80">Generated by ValYoued</p>
            <p className="opacity-80">{formatDate(estimate.createdAt)}</p>
            <p className="opacity-50 mt-4 max-w-xl mx-auto leading-relaxed">
              This report is an estimate based on aggregated market data and AI modeling. It does not
              constitute formal financial or legal advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
