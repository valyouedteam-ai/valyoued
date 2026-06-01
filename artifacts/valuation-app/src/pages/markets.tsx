import { Link } from "wouter";
import { useMemo } from "react";
import { useGetEstimateStats, useListEstimates, useGetFxRates, getGetFxRatesQueryKey } from "@workspace/api-client-react";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatUsdRollupForDisplay } from "@/lib/aggregated-money";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Globe2,
  Info,
  LayoutList,
  PieChart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import type { EstimateSummaryTier } from "@workspace/api-client-react";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";

export default function MarketsPage() {
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const { code: displayCcy } = useDisplayCurrency();
  const { data: stats, isLoading: statsLoading } = useGetEstimateStats();
  const { data: estimates, isLoading: listLoading } = useListEstimates();
  const { data: fxSnap } = useGetFxRates({
    query: {
      queryKey: getGetFxRatesQueryKey(),
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  });
  const { data: billing } = useBillingSummary();
  const billingPaid = Boolean(billing?.hasPaidValuationTier);

  function canHintPayBestForEstimate(tier: EstimateSummaryTier) {
    return billingPaid || tier === "pro";
  }

  const fxMult = fxSnap?.rates;
  /** Rollup payloads from `/estimates/stats` normalized via shared FX hints; formatted in user's reference currency ({@link displayCcy}). */
  const fmtRollup = (rollup: number) => formatUsdRollupForDisplay(rollup, displayCcy, fxMult);

  const rows = useMemo(() => (Array.isArray(estimates) ? estimates : []), [estimates]);
  const canSeeRegionalPayHints = billingPaid || rows.some((e) => e.tier === "pro");

  const loading = statsLoading || listLoading;

  return (
    <div className="space-y-10 pb-16">
      {canSeeRegionalPayHints ? (
      <header className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-sans text-[10px] uppercase tracking-widest">
            Cross-market
          </Badge>
          <Badge variant="secondary" className="font-sans text-[10px] uppercase tracking-widest">
            Comparative pricing
          </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground leading-tight">
          Regions and pricing context
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
          See which regions show up most often as the strongest match across your saved valuations,
          and open any report for fees, shipping, and marketplace links.
        </p>
      </header>
      ) : (
        <header className="space-y-3 pt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Markets overview</h1>
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Upgrade in{" "}
            <Link href="/settings" className="font-medium text-accent hover:underline">
              Settings
            </Link>{" "}
            for cross-market framing, comparative pricing badges on this screen, and the full regional breakdown copy.
            It also unlocks whenever you already have valuations saved from a Professional billing run.
          </p>
        </header>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="flex flex-col items-center gap-2 p-5 text-center sm:p-6">
              <CardDescription className="flex flex-wrap items-center justify-center gap-1.5 text-xs [&_svg]:shrink-0">
                <LayoutList className="h-3.5 w-3.5" /> Valuations
              </CardDescription>
              <CardTitle className="text-3xl font-sans tabular-nums">{stats.count}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="flex flex-col items-center gap-2 p-5 text-center sm:p-6">
              <CardDescription className="flex flex-wrap items-center justify-center gap-1 text-xs [&_svg]:shrink-0">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="min-w-0">Avg. market uplift</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      aria-label="What average market uplift means"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm font-sans" align="center">
                    <p className="font-medium text-foreground">What this shows</p>
                    <p className="mt-2 leading-relaxed text-muted-foreground">
                      Each saved valuation has two mid-range values: a baseline midpoint from similar recent
                      sales, and an adjusted midpoint after today's market signals are folded in (see your
                      report for details).
                    </p>
                    <p className="mt-2 leading-relaxed text-muted-foreground">
                      This percentage is the simple average of how far adjusted sits above or below baseline across
                      all your saved reports. When it reads positive, those adjustments usually lifted the midpoint;
                      when negative, they usually lowered it.
                    </p>
                    <p className="mt-2 leading-relaxed text-muted-foreground">
                      Each gap uses that report&apos;s own currency only, so this figure does not use exchange
                      rates. The baseline and adjusted averages on this row do use approximate FX to express
                      many reports in one number, labeled in your reference currency ({displayCcy}) from
                      Settings.
                    </p>
                  </PopoverContent>
                </Popover>
              </CardDescription>
              <CardTitle className="text-3xl font-sans tabular-nums">{formatPercent(stats.averageUplift)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="flex flex-col items-center gap-2 p-5 text-center sm:p-6">
              <CardDescription className="text-xs">
                Avg. baseline ({displayCcy}, approx.)
              </CardDescription>
              <CardTitle className="text-3xl font-sans tabular-nums">{fmtRollup(stats.averageBaselineUsd)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="flex flex-col items-center gap-2 p-5 text-center sm:p-6">
              <CardDescription className="text-xs">
                Avg. adjusted ({displayCcy}, approx.)
              </CardDescription>
              <CardTitle className="text-3xl font-sans tabular-nums">{fmtRollup(stats.averageAdjustedUsd)}</CardTitle>
            </CardHeader>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe2 className="h-5 w-5 text-accent" />
              Where valuations lean by region
            </CardTitle>
            <CardDescription>
              Counts how often each region was flagged as the top pick. Open a valuation report for
              the full breakdown and seller links.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : !canSeeRegionalPayHints ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Regional payout view</p>
                <p>See which regions show up as the strongest match across your valuations.</p>
                <p>
                  <Link href="/settings" className="font-medium text-accent hover:underline">
                    Subscribe in Settings
                  </Link>
                  {" "}
                  or run a valuation with Professional.
                </p>
              </div>
            ) : stats && stats.topArbitrageRegions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topArbitrageRegions.map((r) => (
                    <TableRow key={r.region}>
                      <TableCell className="font-medium">{r.region}</TableCell>
                      <TableCell className="text-right font-sans tabular-nums">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No valuations yet. Run a valuation to see regional concentration here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-accent" />
              By asset class
            </CardTitle>
            <CardDescription>
              Average adjusted value by type, using the same approximate conversion as{" "}
              <Link href={mergePortfolioHref("/dashboard", portfolioQuerySuffix)} className="text-accent hover:underline">
                your portfolio
              </Link>{" "}
              (totals in {displayCcy} for comparison). Reports still show each item in its own currency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : stats && stats.byAssetType.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset type</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Avg. ({displayCcy}, approx.)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.byAssetType.map((t) => (
                    <TableRow key={t.assetTypeName}>
                      <TableCell className="font-medium">{t.assetTypeName}</TableCell>
                      <TableCell className="text-right font-sans tabular-nums">{t.count}</TableCell>
                      <TableCell className="text-right font-sans text-sm tabular-nums">
                        {fmtRollup(t.averageAdjustedUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No breakdown yet. Add more valuations to compare classes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-accent/25 bg-gradient-to-br from-card to-accent/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-accent" />
            Saved valuations
          </CardTitle>
          <CardDescription>
            Comparative pricing versus recent sales, live marketplace search shortcuts, and optional
            listing drafts are on each report and in{" "}
            <Link href="/listings" className="text-accent hover:underline">
              Ads
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Adjusted</TableHead>
                  <TableHead>Top region (Professional)</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.assetTypeName}</TableCell>
                    <TableCell className="text-right font-sans text-sm">
                      {formatMoney(e.adjustedMid, e.currency)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {canHintPayBestForEstimate(e.tier) ? e.bestArbitrageRegion || "N/A" : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/estimates/${e.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          Report
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="text-sm text-muted-foreground flex-1">
                You have no valuations yet. Start one to populate arbitrage and comparables.
              </p>
              <Link href="/estimate/new">
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  New valuation
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
