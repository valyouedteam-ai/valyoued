import { Link } from "wouter";
import { useMemo } from "react";
import { useGetEstimateStats, useListEstimates, useGetFxRates, getGetFxRatesQueryKey } from "@workspace/api-client-react";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatUsdRollupForDisplay } from "@/lib/aggregated-money";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Globe2,
  LayoutList,
  PieChart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useProTier } from "@/hooks/use-pro-tier";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import type { EstimateSummaryTier } from "@workspace/api-client-react";

export default function MarketsPage() {
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
  const { isPro } = useProTier();
  const { data: billing } = useBillingSummary();
  const billingPaid = Boolean(billing?.hasPaidValuationTier);

  function canHintPayBestForEstimate(tier: EstimateSummaryTier) {
    return billingPaid || tier === "pro";
  }

  const fxMult = fxSnap?.rates;
  const fmtUsd = (usd: number) => formatUsdRollupForDisplay(usd, displayCcy, fxMult);

  const rows = useMemo(() => (Array.isArray(estimates) ? estimates : []), [estimates]);
  const canSeeRegionalPayHints = billingPaid || rows.some((e) => e.tier === "pro");

  const loading = statsLoading || listLoading;

  return (
    <div className="space-y-10 pb-16">
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
          See which regions show up most often as the strongest match across your saved valuations.
          Combined averages here use the same rough FX conversion as your{" "}
          <Link href="/portfolio" className="text-accent hover:underline">
            portfolio
          </Link>{" "}
          (shown in {displayCcy}; change under{" "}
          <Link href="/settings" className="text-accent hover:underline">
            Settings
          </Link>
          ). They are guides, not live bank rates. Open any report for fees, shipping, and marketplace links,
          especially with <span className="font-medium text-foreground">Pro</span> turned on.
        </p>
        {!isPro ? (
          <p className="text-sm text-muted-foreground max-w-2xl">
            Turn on <strong className="text-foreground">Pro</strong> with the toggle in the header
            for full regional detail and comparables inside each report.
          </p>
        ) : null}
      </header>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <LayoutList className="h-3.5 w-3.5" /> Valuations
              </CardDescription>
              <CardTitle className="text-3xl font-sans tabular-nums">{stats.count}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" /> Avg. market uplift
              </CardDescription>
              <CardTitle className="text-3xl font-sans tabular-nums">
                {formatPercent(stats.averageUplift)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Avg. baseline (converted to {displayCcy})</CardDescription>
              <CardTitle className="text-2xl font-sans tabular-nums">
                {fmtUsd(stats.averageBaselineUsd)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Avg. adjusted (converted to {displayCcy})</CardDescription>
              <CardTitle className="text-2xl font-sans tabular-nums">
                {fmtUsd(stats.averageAdjustedUsd)}
              </CardTitle>
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
                  or run a valuation with Pro.
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
              <Link href="/portfolio" className="text-accent hover:underline">
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
                        {fmtUsd(t.averageAdjustedUsd)}
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
            Drill into each asset
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
                  <TableHead>Top region (Pro)</TableHead>
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
