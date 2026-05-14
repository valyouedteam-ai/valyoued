import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Briefcase,
  Plus,
  RefreshCw,
  Activity,
  Zap,
  Megaphone,
  PieChart as PieIcon,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useListEstimates, listEstimates, useGetFxRates, getGetFxRatesQueryKey } from "@workspace/api-client-react";
import type { EstimateSummary } from "@workspace/api-client-react";
import { convertToUsdApprox } from "@workspace/fx-usd";
import { formatMoney, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { GenerateListingDialog } from "@/components/GenerateListingDialog";
import { PortfolioFolders } from "@/components/PortfolioFolders";
import { iconForAssetType } from "@/lib/asset-icons";

const TICK_INTERVAL_MS = 2500;
const POLL_INTERVAL_MS = 60_000;

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#ef4444", "#84cc16", "#f97316", "#6366f1",
];

type Tick = { mult: number; dir: "up" | "down" | "flat" };

function makeTick(prev: number, seed: number): Tick {
  const drift = (Math.sin(seed * 1.7) + Math.cos(seed * 0.9)) * 0.0008;
  const noise = (Math.random() - 0.5) * 0.0025;
  const next = Math.max(0.985, Math.min(1.015, prev + drift + noise));
  const dir: Tick["dir"] = next > prev + 0.0001 ? "up" : next < prev - 0.0001 ? "down" : "flat";
  return { mult: next, dir };
}

export default function PortfolioPage() {
  const { data: estimates, isLoading, refetch, isFetching, dataUpdatedAt } = useListEstimates({
    query: {
      refetchInterval: POLL_INTERVAL_MS,
    } as unknown as UseQueryOptions<Awaited<ReturnType<typeof listEstimates>>, Error>,
  });

  const { data: fxSnap } = useGetFxRates({
    query: {
      queryKey: getGetFxRatesQueryKey(),
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  });

  const estimateRows = useMemo(
    () => (Array.isArray(estimates) ? estimates : []),
    [estimates],
  );

  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [now, setNow] = useState(() => Date.now());
  const [listingFor, setListingFor] = useState<EstimateSummary | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (estimateRows.length === 0) return;
    const interval = setInterval(() => {
      setTicks((prev) => {
        const next: Record<string, Tick> = {};
        for (const e of estimateRows) {
          const cur = prev[e.id]?.mult ?? 1;
          next[e.id] = makeTick(cur, Date.now() / 1000);
        }
        return next;
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [estimateRows]);

  useEffect(() => {
    setTicks({});
  }, [dataUpdatedAt]);

  const portfolio = useMemo(() => {
    if (estimateRows.length === 0) return [];
    return estimateRows.map((e) => {
      const tick = ticks[e.id];
      const liveValue = e.adjustedMid * (tick?.mult ?? 1);
      const changeFromBaseline = e.baselineMid > 0 ? (liveValue - e.baselineMid) / e.baselineMid : 0;
      const sessionChange = (tick?.mult ?? 1) - 1;
      return { ...e, liveValue, changeFromBaseline, sessionChange, tickDir: tick?.dir ?? "flat" };
    });
  }, [estimateRows, ticks]);

  // Group by asset class
  const albums = useMemo(() => {
    if (!portfolio.length) return [];
    const mult = fxSnap?.rates;
    const map = new Map<string, typeof portfolio>();
    for (const p of portfolio) {
      const arr = map.get(p.assetTypeName) ?? [];
      arr.push(p);
      map.set(p.assetTypeName, arr);
    }
    return Array.from(map.entries())
      .map(([name, items]) => {
        const totalUsd = items.reduce((s, i) => s + convertToUsdApprox(i.liveValue, i.currency, mult), 0);
        const baselineUsd = items.reduce((s, i) => s + convertToUsdApprox(i.baselineMid, i.currency, mult), 0);
        const change = baselineUsd > 0 ? (totalUsd - baselineUsd) / baselineUsd : 0;
        return { name, items, totalUsd, baselineUsd, change };
      })
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [portfolio, fxSnap?.rates]);

  const totalPortfolioUsd = albums.reduce((s, a) => s + a.totalUsd, 0);
  const totalBaselineUsd = albums.reduce((s, a) => s + a.baselineUsd, 0);
  const totalChange = totalBaselineUsd > 0 ? (totalPortfolioUsd - totalBaselineUsd) / totalBaselineUsd : 0;

  const pieData = albums.map((a, i) => ({
    name: a.name,
    value: Math.round(a.totalUsd),
    pct: totalPortfolioUsd > 0 ? a.totalUsd / totalPortfolioUsd : 0,
    color: PALETTE[i % PALETTE.length],
  }));

  // Diversification score: 0 = single asset class, 100 = perfectly even across many classes
  const diversificationScore = useMemo(() => {
    if (pieData.length === 0) return 0;
    if (pieData.length === 1) return 0;
    const hhi = pieData.reduce((s, p) => s + p.pct * p.pct, 0); // Herfindahl index
    const normalized = (1 - hhi) / (1 - 1 / pieData.length);
    return Math.round(normalized * 100);
  }, [pieData]);

  const lastSync = dataUpdatedAt ? Math.max(0, Math.floor((now - dataUpdatedAt) / 1000)) : 0;

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (estimateRows.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-12">
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-xl bg-card/30">
          <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-2xl font-sans mb-2">Your portfolio is empty</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Run a valuation on any asset and it will appear here. We'll keep tracking how its value moves with the market.
          </p>
          <Link href="/estimate/new">
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Value your first asset
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-accent mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Live Portfolio · Streaming
          </div>
          <h1 className="text-3xl font-sans font-bold text-foreground">My Portfolio</h1>
          <p className="text-muted-foreground mt-1">
            {portfolio.length} asset{portfolio.length === 1 ? "" : "s"} · {albums.length} class
            {albums.length === 1 ? "" : "es"} · synced {lastSync < 60 ? `${lastSync}s ago` : `${Math.floor(lastSync / 60)}m ago`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/estimate/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New valuation
            </Button>
          </Link>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            {isFetching ? "Syncing" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Top stats: total + diversification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 bg-card/60 backdrop-blur border-accent/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
              <Activity className="h-3 w-3 text-accent" />
              Total Portfolio Value (USD-eq)
            </CardDescription>
            <CardTitle className="text-3xl font-mono tabular-nums tracking-tight">
              {formatMoney(totalPortfolioUsd, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className={cn(
              "flex items-center gap-2 text-sm font-medium",
              totalChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {totalChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="font-mono">{formatPercent(totalChange, true)}</span>
              <span className="text-muted-foreground font-sans">vs cost basis</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 font-mono">
              cost basis {formatMoney(totalBaselineUsd, "USD")}
            </div>
            <div className="text-[10px] text-muted-foreground/90 mt-1.5 font-mono leading-snug">
              USD-eq ·{" "}
              {!fxSnap ? (
                "FX rates loading…"
              ) : (
                <>
                  {fxSnap.source === "frankfurter"
                    ? `ECB ${fxSnap.asOf ?? "—"}`
                    : "Static fallbacks"}
                  {(() => {
                    const d = new Date(fxSnap.fetchedAt);
                    return Number.isNaN(d.getTime())
                      ? ""
                      : ` · refetched ${formatDistanceToNow(d, { addSuffix: true })}`;
                  })()}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-card/60 backdrop-blur border-border/40 relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-sans flex items-center gap-2 text-base">
                <PieIcon className="h-4 w-4 text-accent" />
                Diversification
              </CardTitle>
              <Badge variant="outline" className="font-mono">
                Score {diversificationScore}/100
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {diversificationScore >= 70
                ? "Well-spread across asset classes."
                : diversificationScore >= 40
                  ? "Moderate concentration; consider broader exposure."
                  : "Heavily concentrated: most of your wealth sits in one asset class."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-52 grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v: any, n: any) => [formatMoney(Number(v), "USD"), n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 text-xs pr-2">
                {pieData.slice(0, 6).map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="truncate flex-1">{d.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {(d.pct * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
                {pieData.length > 6 && (
                  <div className="text-muted-foreground italic">
                    +{pieData.length - 6} more class{pieData.length - 6 === 1 ? "" : "es"}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart folders: drag assets between Hold / Monitor / Sell */}
      <PortfolioFolders
        items={portfolio.map((p) => ({
          id: p.id,
          title: p.title,
          assetTypeName: p.assetTypeName,
          liveValue: p.liveValue,
          currency: p.currency,
        }))}
      />

      {/* Albums + Boxes / Holdings */}
      <Tabs defaultValue="albums">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-sans">Your collection</h2>
          <TabsList>
            <TabsTrigger value="albums" data-testid="tab-albums">
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Albums
            </TabsTrigger>
            <TabsTrigger value="boxes" data-testid="tab-boxes">
              <Briefcase className="h-3.5 w-3.5 mr-1.5" /> Asset boxes
            </TabsTrigger>
            <TabsTrigger value="table" data-testid="tab-table">
              <ListIcon className="h-3.5 w-3.5 mr-1.5" /> Table
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Albums grouped by asset class */}
        <TabsContent value="albums" className="space-y-6 mt-4">
          {albums.map((album, idx) => (
            <Card key={album.name} className="overflow-hidden bg-card/40">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: PALETTE[idx % PALETTE.length] }}
                    />
                    <CardTitle className="font-sans text-lg">{album.name}</CardTitle>
                    <Badge variant="secondary" className="font-mono">
                      {album.items.length} item{album.items.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold tabular-nums">
                      {formatMoney(album.totalUsd, "USD")}
                    </div>
                    <div className={cn(
                      "text-xs font-mono",
                      album.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {formatPercent(album.change, true)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {album.items.map((item) => (
                    <AssetBox
                      key={item.id}
                      item={item}
                      onListing={() => setListingFor(item)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Boxes: flat grid of all assets */}
        <TabsContent value="boxes" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {portfolio.map((item) => (
              <AssetBox key={item.id} item={item} onListing={() => setListingFor(item)} />
            ))}
          </div>
        </TabsContent>

        {/* TABLE */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-3">Asset</th>
                      <th className="text-left px-2 py-3 hidden md:table-cell">Class</th>
                      <th className="text-right px-2 py-3">Cost</th>
                      <th className="text-right px-2 py-3">Live</th>
                      <th className="text-right px-2 py-3">P&L</th>
                      <th className="text-right px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((p) => {
                      const isUp = p.changeFromBaseline >= 0;
                      return (
                        <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3">
                            <Link href={`/estimates/${p.id}`} className="font-medium hover:text-accent transition-colors line-clamp-1">
                              {p.title}
                            </Link>
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                            </div>
                          </td>
                          <td className="px-2 py-3 hidden md:table-cell">
                            <Badge variant="outline" className="font-normal text-xs">{p.assetTypeName}</Badge>
                          </td>
                          <td className="px-2 py-3 text-right font-mono tabular-nums text-muted-foreground">
                            {formatMoney(p.baselineMid, p.currency)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <div className={cn(
                              "font-mono tabular-nums font-semibold",
                              p.tickDir === "up" && "text-green-600 dark:text-green-400",
                              p.tickDir === "down" && "text-red-600 dark:text-red-400",
                            )}>
                              {formatMoney(p.liveValue, p.currency)}
                            </div>
                          </td>
                          <td className={cn(
                            "px-2 py-3 text-right font-mono tabular-nums font-medium",
                            isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {formatPercent(p.changeFromBaseline, true)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => setListingFor(p)}
                                title="Generate listing ad"
                              >
                                <Megaphone className="h-3.5 w-3.5" />
                              </Button>
                              <Link href={`/estimates/${p.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Live ticker strip */}
      <div className="rounded-lg border border-accent/20 bg-card/40 backdrop-blur p-3 overflow-hidden">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent/10 text-accent uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            LIVE
          </span>
          <div className="flex gap-6 overflow-x-auto whitespace-nowrap">
            {portfolio.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-2">
                <span className="text-muted-foreground">{p.assetTypeName.split(" ")[0].toUpperCase()}·{p.id.slice(0, 4).toUpperCase()}</span>
                <span className="font-semibold tabular-nums">{formatMoney(p.liveValue, p.currency)}</span>
                <span className={cn(
                  "tabular-nums",
                  p.sessionChange > 0 ? "text-green-500" : p.sessionChange < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {formatPercent(p.sessionChange, true)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {listingFor && (
        <GenerateListingDialog
          estimateId={listingFor.id}
          estimateTitle={listingFor.title}
          assetTypeName={listingFor.assetTypeName}
          open={true}
          onOpenChange={(open) => !open && setListingFor(null)}
        />
      )}
    </div>
  );
}

interface BoxItem {
  id: string;
  title: string;
  assetTypeName: string;
  baselineMid: number;
  liveValue: number;
  changeFromBaseline: number;
  tickDir: "up" | "down" | "flat";
  currency: string;
  createdAt: string;
}

function AssetBox({ item, onListing }: { item: BoxItem; onListing: () => void }) {
  const isUp = item.changeFromBaseline >= 0;
  const [, navigate] = useLocation();
  const goToEstimate = () => navigate(`/estimates/${item.id}`);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={goToEstimate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToEstimate();
        }
      }}
      className="group relative rounded-xl border border-border bg-card/60 hover:bg-card hover:border-accent/40 transition-all overflow-hidden p-4 flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
      data-testid="asset-box"
    >
      <div className="flex-1 min-h-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1 flex items-start gap-2">
            <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              {(() => {
                const Icon = iconForAssetType(item.assetTypeName);
                return <Icon className="h-4 w-4" />;
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-sans text-sm font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                {item.title}
              </h4>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                {item.assetTypeName}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "h-2 w-2 rounded-full mt-1 shrink-0",
              item.tickDir === "up" && "bg-green-500 animate-pulse",
              item.tickDir === "down" && "bg-red-500 animate-pulse",
              item.tickDir === "flat" && "bg-muted-foreground/40",
            )}
          />
        </div>

        <div className="space-y-1">
          <div
            className={cn(
              "font-mono text-xl font-semibold tabular-nums leading-none",
              item.tickDir === "up" && "text-green-600 dark:text-green-400",
              item.tickDir === "down" && "text-red-600 dark:text-red-400",
              item.tickDir === "flat" && "text-foreground",
            )}
          >
            {formatMoney(item.liveValue, item.currency)}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {isUp ? (
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
            <span className={cn(
              "font-mono tabular-nums",
              isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
            )}>
              {formatPercent(item.changeFromBaseline, true)}
            </span>
            <span className="text-muted-foreground">
              · cost {formatMoney(item.baselineMid, item.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onListing();
          }}
          data-testid="box-listing-btn"
        >
          <Megaphone className="h-3 w-3 mr-1.5" />
          List for sale
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={(e) => {
            e.stopPropagation();
            goToEstimate();
          }}
          aria-label="Open estimate"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {item.tickDir !== "flat" && (
        <Zap
          className={cn(
            "absolute top-2 right-2 h-3 w-3 opacity-50",
            item.tickDir === "up" ? "text-green-500" : "text-red-500",
          )}
        />
      )}
    </div>
  );
}
