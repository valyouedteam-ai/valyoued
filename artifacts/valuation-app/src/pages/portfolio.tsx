import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Briefcase,
  Plus,
  Activity,
  Megaphone,
  PieChart as PieIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useListEstimates, listEstimates, useGetFxRates, getGetFxRatesQueryKey } from "@workspace/api-client-react";
import type { EstimateSummary } from "@workspace/api-client-react";
import { convertToUsdApprox } from "@workspace/fx-usd";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatUsdRollupForDisplay } from "@/lib/aggregated-money";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GenerateListingDialog } from "@/components/GenerateListingDialog";
import { PortfolioFolders } from "@/components/PortfolioFolders";
import { iconForAssetType } from "@/lib/asset-icons";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";

type PortfolioItem = EstimateSummary & {
  liveValue: number;
  changeFromBaseline: number;
};

type ClassAlbum = {
  name: string;
  items: PortfolioItem[];
  totalUsd: number;
  baselineUsd: number;
  change: number;
};

type PortfolioShelf = EstimateSummary["portfolioShelf"];

function inPortfolioWorkspaceRow(
  e: EstimateSummary,
  activeId: string | null,
  primaryId: string | null,
): boolean {
  if (!activeId || !primaryId) return true;
  if (activeId === primaryId) return !e.portfolioId || e.portfolioId === primaryId;
  return e.portfolioId === activeId;
}

function buildClassAlbums(
  items: PortfolioItem[],
  mult: Readonly<Record<string, number>> | null | undefined,
): ClassAlbum[] {
  if (items.length === 0) return [];
  const map = new Map<string, PortfolioItem[]>();
  for (const p of items) {
    const arr = map.get(p.assetTypeName) ?? [];
    arr.push(p);
    map.set(p.assetTypeName, arr);
  }
  return Array.from(map.entries())
    .map(([name, rows]) => {
      const totalUsd = rows.reduce((s, i) => s + convertToUsdApprox(i.liveValue, i.currency, mult), 0);
      const baselineUsd = rows.reduce((s, i) => s + convertToUsdApprox(i.baselineMid, i.currency, mult), 0);
      const change = baselineUsd > 0 ? (totalUsd - baselineUsd) / baselineUsd : 0;
      return { name, items: rows, totalUsd, baselineUsd, change };
    })
    .sort((a, b) => b.totalUsd - a.totalUsd);
}

const SHELF_SECTION_META: Record<
  PortfolioShelf,
  { title: string; description: string }
> = {
  luxury: {
    title: "Luxury & collectibles",
    description: "High-end and collectible items from the luxury valuation track.",
  },
  everyday: {
    title: "Everyday & tech",
    description: "Day-to-day and mass-market items from the standard track.",
  },
  other: {
    title: "Other holdings",
    description: "Anything that spans tracks or doesn't fit neatly above (vehicles, property, mixed runs, and similar).",
  },
};

const POLL_INTERVAL_MS = 60_000;

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#ef4444", "#84cc16", "#f97316", "#6366f1",
];

export default function PortfolioPage() {
  const { code: displayCcy } = useDisplayCurrency();
  const { portfolioQuerySuffix, activePortfolio, primaryPortfolio } = usePortfolioWorkspace();

  const { data: estimates, isLoading } = useListEstimates({
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

  const scopedRows = useMemo(() => {
    const act = activePortfolio?.id ?? null;
    const prim = primaryPortfolio?.id ?? null;
    return estimateRows.filter((e) => inPortfolioWorkspaceRow(e, act, prim));
  }, [estimateRows, activePortfolio?.id, primaryPortfolio?.id]);

  const [listingFor, setListingFor] = useState<EstimateSummary | null>(null);

  const portfolio = useMemo(() => {
    if (scopedRows.length === 0) return [];
    return scopedRows.map((e) => {
      const liveValue = e.adjustedMid;
      const changeFromBaseline = e.baselineMid > 0 ? (liveValue - e.baselineMid) / e.baselineMid : 0;
      return { ...e, liveValue, changeFromBaseline };
    });
  }, [scopedRows]);

  const classAlbums = useMemo(
    () => buildClassAlbums(portfolio, fxSnap?.rates),
    [portfolio, fxSnap?.rates],
  );

  const shelfSections = useMemo(() => {
    const order: PortfolioShelf[] = ["luxury", "everyday", "other"];
    const mult = fxSnap?.rates;
    return order
      .map((shelf) => {
        const slice = portfolio.filter((p) => p.portfolioShelf === shelf);
        if (slice.length === 0) return null;
        const meta = SHELF_SECTION_META[shelf];
        return {
          shelf,
          title: meta.title,
          description: meta.description,
          albums: buildClassAlbums(slice, mult),
          sectionTotalUsd: slice.reduce((s, i) => s + convertToUsdApprox(i.liveValue, i.currency, mult), 0),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s != null);
  }, [portfolio, fxSnap?.rates]);

  const totalPortfolioUsd = classAlbums.reduce((s, a) => s + a.totalUsd, 0);
  const totalBaselineUsd = classAlbums.reduce((s, a) => s + a.baselineUsd, 0);
  const totalChange = totalBaselineUsd > 0 ? (totalPortfolioUsd - totalBaselineUsd) / totalBaselineUsd : 0;

  const pieData = classAlbums.map((a, i) => ({
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

  const fxMult = fxSnap?.rates;

  const formatRollup = (usd: number) => formatUsdRollupForDisplay(usd, displayCcy, fxMult);

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

  if (scopedRows.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-12">
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-xl bg-card/30">
          <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-2xl font-sans mb-2">
            {activePortfolio && primaryPortfolio && activePortfolio.id !== primaryPortfolio.id
              ? `${activePortfolio.label ?? "This workspace"} is empty`
              : "Your portfolio is empty"}
          </h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Run a valuation and attach it to this workspace{" "}
            {activePortfolio && primaryPortfolio && activePortfolio.id !== primaryPortfolio.id
              ? "Pick another workspace in Settings to see your main ledger."
              : "to see holdings, shelf mix, and listing shortcuts."}
          </p>
          <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>
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
          <h1 className="text-3xl font-sans font-bold text-foreground">My Portfolio</h1>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground mt-2">
            {activePortfolio?.label ??
              (activePortfolio?.purpose === "pro_board" ? "Professional board" : "Primary")}
          </p>
        </div>
        <div>
          <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New valuation
            </Button>
          </Link>
        </div>
      </div>

      {/* Top stats: total + diversification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 bg-card/60 backdrop-blur border-accent/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-3.5 w-3.5 shrink-0 text-accent" />
              Approximate portfolio total
            </CardDescription>
            <CardTitle className="text-3xl font-sans tabular-nums tracking-tight">
              {formatRollup(totalPortfolioUsd)}
            </CardTitle>
            <p className="mt-1.5 text-xs text-muted-foreground font-sans font-normal leading-snug">
              <Link href="/settings" className="font-medium text-accent hover:underline">
                Change display currency
              </Link>
            </p>
          </CardHeader>
          <CardContent className="relative">
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm tabular-nums",
                totalChange >= 0
                  ? "text-emerald-800/85 dark:text-emerald-400/90"
                  : "text-rose-800/85 dark:text-rose-400/90",
              )}
            >
              <span>{formatPercent(totalChange, true)}</span>
              <span className="text-muted-foreground font-normal">vs. baseline valuations</span>
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
              <Badge variant="outline" className="font-sans">
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
                    formatter={(v: any, n: any) => [formatRollup(Number(v)), n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 text-xs pr-2">
                {pieData.slice(0, 6).map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="truncate flex-1">{d.name}</span>
                    <span className="font-sans tabular-nums text-muted-foreground">
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

      {/* Collection: single grouped view (by valuation track), highest approximate value first */}
      <section className="space-y-8" data-testid="collection-section">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight">Your collection</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Valuations are grouped by the track you chose when you ran them. Within each group, larger holdings
            (by approximate value in your display currency) appear first. Open a card for the full report, or use{" "}
            <span className="text-foreground font-medium">List for sale</span> for listing help.
          </p>
        </div>

        <div className="space-y-12">
          {shelfSections.map((section) => {
            const items = portfolio
              .filter((p) => p.portfolioShelf === section.shelf)
              .sort(
                (a, b) =>
                  convertToUsdApprox(b.liveValue, b.currency, fxMult) -
                  convertToUsdApprox(a.liveValue, a.currency, fxMult),
              );
            const count = items.length;
            return (
              <div key={section.shelf} className="space-y-4" data-testid={`shelf-${section.shelf}`}>
                <div className="flex flex-col gap-3 border-b border-border/40 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{section.title}</h3>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {count} {count === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-prose">
                      {section.description}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-[11px] text-muted-foreground">Group total (approx.)</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{formatRollup(section.sectionTotalUsd)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <AssetBox
                      key={item.id}
                      item={item}
                      portfolioHrefSuffix={portfolioQuerySuffix}
                      onListing={() => setListingFor(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

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

type BoxItem = PortfolioItem;

function AssetBox({
  item,
  onListing,
  portfolioHrefSuffix,
}: {
  item: BoxItem;
  onListing: () => void;
  portfolioHrefSuffix: string;
}) {
  const isUp = item.changeFromBaseline >= 0;
  const [, navigate] = useLocation();
  const goToEstimate = () =>
    navigate(mergePortfolioHref(`/estimates/${item.id}`, portfolioHrefSuffix));

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
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border/70 bg-card/75 p-4 transition-colors hover:bg-card hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      data-testid="asset-box"
    >
      <div className="min-h-0 flex-1">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-foreground/80">
              {(() => {
                const Icon = iconForAssetType(item.assetTypeName);
                return <Icon className="h-4 w-4" />;
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-2 font-sans text-sm font-semibold leading-snug text-foreground group-hover:underline group-hover:decoration-muted-foreground/50 group-hover:underline-offset-2">
                {item.title}
              </h4>
              <p className="mt-1 font-sans text-[11px] text-muted-foreground">{item.assetTypeName}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="font-sans text-xl font-semibold tabular-nums leading-none text-foreground">
            {formatMoney(item.liveValue, item.currency)}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs">
            <span
              className={cn(
                "font-sans tabular-nums font-medium",
                isUp ? "text-emerald-800/80 dark:text-emerald-400/85" : "text-rose-800/85 dark:text-rose-400/85",
              )}
            >
              {formatPercent(item.changeFromBaseline, true)}
            </span>
            <span className="text-muted-foreground">· cost {formatMoney(item.baselineMid, item.currency)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border/35 pt-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onListing();
          }}
          data-testid="box-listing-btn"
        >
          <Megaphone className="mr-1.5 h-3 w-3" />
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
    </div>
  );
}
