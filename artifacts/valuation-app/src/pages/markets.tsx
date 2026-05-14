import { Link } from "wouter";
import { useMemo } from "react";
import { useGetEstimateStats, useListEstimates } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { formatMoney, formatPercent } from "@/lib/format";
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

export default function MarketsPage() {
  const { data: stats, isLoading: statsLoading } = useGetEstimateStats();
  const { data: estimates, isLoading: listLoading } = useListEstimates();
  const { isPro } = useProTier();

  const rows = useMemo(() => (Array.isArray(estimates) ? estimates : []), [estimates]);

  const loading = statsLoading || listLoading;

  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
            Cross-market
          </Badge>
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-widest">
            Comparative pricing
          </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground leading-tight">
          Arbitrage &amp; marketplace context
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
          Portfolio-level view of where your valuations point for net seller outcomes and demand by
          region. Summary figures below use USD equivalents from static FX hints (same as{" "}
          <Link href="/portfolio" className="text-accent hover:underline">
            My Portfolio
          </Link>
          ), not live market FX. Per-asset friction tables (fees, shipping, duties) and live
          marketplace links live on each valuation report with{" "}
          <span className="font-medium text-foreground">Pro</span> enabled.
        </p>
        {!isPro ? (
          <p className="text-sm text-muted-foreground max-w-2xl">
            Turn on <strong className="text-foreground">Pro Mode</strong> in the sidebar to unlock
            full regional arbitrage grids and comparables inside any report.
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
              <CardTitle className="text-3xl font-mono tabular-nums">{stats.count}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" /> Avg. market uplift
              </CardDescription>
              <CardTitle className="text-3xl font-mono tabular-nums">
                {formatPercent(stats.averageUplift)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                Avg. baseline, USD equiv. (static FX)
              </CardDescription>
              <CardTitle className="text-2xl font-mono tabular-nums">
                {formatMoney(stats.averageBaselineUsd, "USD", true)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">
                Avg. adjusted, USD equiv. (static FX)
              </CardDescription>
              <CardTitle className="text-2xl font-mono tabular-nums">
                {formatMoney(stats.averageAdjustedUsd, "USD", true)}
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
              Regions appearing as &quot;best net&quot;
            </CardTitle>
            <CardDescription>
              How often each region showed up as the top arbitrage destination across your dossiers.
              Open a report for marketplace-level net-to-seller lines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
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
                      <TableCell className="text-right font-mono tabular-nums">{r.count}</TableCell>
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
              Mean adjusted midpoint by asset type, converted to USD with the same static FX table as
              the portfolio dashboard. Open a report for the original row currency.
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
                    <TableHead className="text-right">Avg. adj. (USD ~)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.byAssetType.map((t) => (
                    <TableRow key={t.assetTypeName}>
                      <TableCell className="font-medium">{t.assetTypeName}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{t.count}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatMoney(t.averageAdjustedUsd, "USD", true)}
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
              Ad Drafts
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
                  <TableHead>Best region (hint)</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.assetTypeName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMoney(e.adjustedMid, e.currency)}
                    </TableCell>
                    <TableCell className="text-sm">{e.bestArbitrageRegion || "—"}</TableCell>
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

      <p className="text-xs text-muted-foreground font-mono">
        Updated from your account data ·{" "}
        {rows[0]?.createdAt
          ? `latest ${formatDistanceToNow(new Date(rows[0].createdAt), { addSuffix: true })}`
          : "—"}
      </p>
    </div>
  );
}
