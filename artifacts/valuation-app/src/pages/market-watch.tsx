import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  useCreateMarketWatch,
  useDeleteMarketWatch,
  useListMarketWatches,
  useRefreshMarketWatch,
  getListMarketWatchesQueryKey,
} from "@workspace/api-client-react";
import { LineChart, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { formatMoney } from "@/lib/format";
import {
  MARKET_WATCH_ASSET_CLASSES,
  composeMarketWatchLabel,
  formatMarketWatchCardSubtitle,
  formatMarketWatchCardTitle,
} from "@/lib/market-watch-presets";
import { useToast } from "@/hooks/use-toast";
import { PageTitle } from "@/components/layout/PageTitle";

function marketWatchErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.data as { error?: string } | undefined;
    if (typeof body?.error === "string" && body.error.trim()) return body.error;
    return err.message;
  }
  return err instanceof Error ? err.message : "Could not save this market watch.";
}

export default function MarketWatchPage() {
  const { data: billing } = useBillingSummary();
  const pro = Boolean(billing?.canUseTraderWorkspace);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: watches, isLoading } = useListMarketWatches({
    query: { enabled: pro, queryKey: getListMarketWatchesQueryKey() },
  });

  const refreshWatches = async () => {
    await queryClient.invalidateQueries({ queryKey: getListMarketWatchesQueryKey() });
  };

  const resetForm = () => {
    setBrand("");
    setModel("");
    setVariant("");
    setYearFrom("");
    setYearTo("");
  };

  const create = useCreateMarketWatch({
    mutation: {
      onSuccess: async () => {
        resetForm();
        await refreshWatches();
        toast({
          title: "Market watch saved",
          description: "Web-researched analytics snapshot is ready.",
        });
      },
      onError: (err) => {
        toast({
          title: "Could not save market watch",
          description: marketWatchErrorMessage(err),
          variant: "destructive",
        });
      },
    },
  });
  const del = useDeleteMarketWatch({
    mutation: {
      onSuccess: () => void refreshWatches(),
      onError: (err) => {
        toast({
          title: "Could not delete market watch",
          description: marketWatchErrorMessage(err),
          variant: "destructive",
        });
      },
    },
  });

  const refresh = useRefreshMarketWatch({
    mutation: {
      onSuccess: async () => {
        await refreshWatches();
        toast({ title: "Snapshot refreshed", description: "Latest web research is applied." });
      },
      onError: (err) => {
        toast({
          title: "Could not refresh market watch",
          description: marketWatchErrorMessage(err),
          variant: "destructive",
        });
      },
    },
  });

  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const [assetClassId, setAssetClassId] = useState(MARKET_WATCH_ASSET_CLASSES[0]?.id ?? "luxury-bags");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  const assetClassPreset = useMemo(
    () => MARKET_WATCH_ASSET_CLASSES.find((c) => c.id === assetClassId) ?? MARKET_WATCH_ASSET_CLASSES[0],
    [assetClassId],
  );

  const brandPreset = useMemo(
    () => assetClassPreset?.brands.find((b) => b.label === brand),
    [assetClassPreset, brand],
  );

  const modelPreset = useMemo(
    () => brandPreset?.models.find((m) => m.label === model),
    [brandPreset, model],
  );

  const variants = modelPreset?.variants ?? [];
  const previewLabel = useMemo(() => {
    if (!brand.trim() || !model.trim()) return null;
    const parsedYearFrom = yearFrom.trim() ? Number.parseInt(yearFrom, 10) : undefined;
    const parsedYearTo = yearTo.trim() ? Number.parseInt(yearTo, 10) : undefined;
    return composeMarketWatchLabel({
      brand: brand.trim(),
      model: model.trim(),
      variant: variant.trim() || undefined,
      yearFrom: Number.isFinite(parsedYearFrom) ? parsedYearFrom : undefined,
      yearTo: Number.isFinite(parsedYearTo) ? parsedYearTo : undefined,
    });
  }, [brand, model, variant, yearFrom, yearTo]);

  const canSave = Boolean(brand.trim() && model.trim() && previewLabel);

  const saveWatch = () => {
    if (!canSave || !previewLabel || !assetClassPreset || create.isPending) return;
    const parsedYearFrom = yearFrom.trim() ? Number.parseInt(yearFrom, 10) : undefined;
    const parsedYearTo = yearTo.trim() ? Number.parseInt(yearTo, 10) : undefined;
    const modelLine = variant.trim() ? `${model.trim()} (${variant.trim()})` : model.trim();
    create.mutate({
      data: {
        assetClass: assetClassPreset.apiAssetClass,
        brand: brand.trim(),
        model: modelLine,
        label: previewLabel,
        yearFrom: Number.isFinite(parsedYearFrom) ? parsedYearFrom : undefined,
        yearTo: Number.isFinite(parsedYearTo) ? parsedYearTo : undefined,
      },
    });
  };

  if (!pro) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
        <LineChart className="mx-auto h-12 w-12 text-muted-foreground" />
        <PageTitle>Market Watch</PageTitle>
        <p className="text-muted-foreground">
          Professional traders track specific models with price trends, sold comps, and buy-below targets here.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/settings">Upgrade to Professional</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="space-y-2">
        <PageTitle>Market Watch</PageTitle>
        <p className="text-muted-foreground leading-relaxed max-w-3xl">
          Keep watch over a product brand and model you trade often to get alerts on list prices, buy-below targets and
          resale timing.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create market watch</CardTitle>
          <CardDescription>
            Choose the asset class, then narrow to the exact brand, model, and size or trim you care about.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="market-watch-asset-class">Asset class</Label>
            <Select
              value={assetClassId}
              onValueChange={(next) => {
                setAssetClassId(next);
                resetForm();
              }}
            >
              <SelectTrigger id="market-watch-asset-class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKET_WATCH_ASSET_CLASSES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="market-watch-brand">Brand</Label>
            <Select
              value={brand || undefined}
              onValueChange={(next) => {
                setBrand(next);
                setModel("");
                setVariant("");
              }}
            >
              <SelectTrigger id="market-watch-brand">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {assetClassPreset.brands.map((b) => (
                  <SelectItem key={b.label} value={b.label}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="market-watch-model">Model</Label>
            <Select
              value={model || undefined}
              onValueChange={(next) => {
                setModel(next);
                setVariant("");
              }}
              disabled={!brand}
            >
              <SelectTrigger id="market-watch-model">
                <SelectValue placeholder={brand ? "Select model" : "Pick a brand first"} />
              </SelectTrigger>
              <SelectContent>
                {(brandPreset?.models ?? []).map((m) => (
                  <SelectItem key={m.label} value={m.label}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {variants.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="market-watch-variant">
                {assetClassId === "luxury-bags" ? "Size" : assetClassId === "cars" ? "Trim" : "Variant"}
              </Label>
              <Select value={variant || undefined} onValueChange={setVariant} disabled={!model}>
                <SelectTrigger id="market-watch-variant">
                  <SelectValue placeholder="Select size or trim" />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {assetClassPreset.showYearRange ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="market-watch-year-from">Model year from</Label>
                <Input
                  id="market-watch-year-from"
                  inputMode="numeric"
                  placeholder="2018"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market-watch-year-to">Model year to</Label>
                <Input
                  id="market-watch-year-to"
                  inputMode="numeric"
                  placeholder="2022"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </>
          ) : null}

          <div className="sm:col-span-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Watching</p>
            <p className="mt-1 font-medium text-foreground">
              {previewLabel ?? "Select brand and model to preview this watch."}
            </p>
          </div>

          <Button
            type="button"
            className="sm:col-span-2 rounded-full"
            disabled={!canSave || create.isPending}
            onClick={saveWatch}
          >
            {create.isPending ? "Researching market…" : "Save market watch"}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : watches?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {watches.map((w) => {
            const isRefreshing = refresh.isPending && refreshingId === w.id;
            const status = w.snapshotStatus ?? "ready";
            const showMetrics = status === "ready" && w.snapshot?.suggestedListingPrice != null;

            return (
            <Card key={w.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{formatMarketWatchCardTitle(w)}</CardTitle>
                    {status === "pending" || isRefreshing ? (
                      <Badge variant="secondary">Researching…</Badge>
                    ) : status === "failed" ? (
                      <Badge variant="destructive">Research failed</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{formatMarketWatchCardSubtitle(w)}</p>
                  {w.snapshotUpdatedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(w.snapshotUpdatedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Refresh market watch"
                    disabled={isRefreshing || create.isPending}
                    onClick={() => {
                      setRefreshingId(w.id);
                      refresh.mutate(
                        { id: w.id },
                        { onSettled: () => setRefreshingId(null) },
                      );
                    }}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete market watch"
                    disabled={del.isPending}
                    onClick={() => del.mutate({ id: w.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {status === "pending" || isRefreshing ? (
                  <p className="text-muted-foreground">Running web research for this model…</p>
                ) : status === "failed" ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">Research did not complete. Try refresh.</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isRefreshing}
                      onClick={() => {
                        setRefreshingId(w.id);
                        refresh.mutate(
                          { id: w.id },
                          { onSettled: () => setRefreshingId(null) },
                        );
                      }}
                    >
                      Retry research
                    </Button>
                  </div>
                ) : showMetrics ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Suggested list</p>
                        <p className="font-semibold tabular-nums">
                          {formatMoney(w.snapshot.suggestedListingPrice, "GBP")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Buy below</p>
                        <p className="font-semibold tabular-nums">
                          {formatMoney(w.snapshot.buyBelowPrice, "GBP")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg days to sell</p>
                        <p className="font-semibold">{w.snapshot.avgDaysToSell}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Best platform</p>
                        <p className="font-semibold">{w.snapshot.bestPlatform}</p>
                      </div>
                    </div>
                    {w.snapshot.analyticsNote ? (
                      <p className="text-xs text-muted-foreground">{w.snapshot.analyticsNote}</p>
                    ) : null}
                    {w.citations?.length ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sources</p>
                        <ul className="space-y-1 text-xs">
                          {w.citations.slice(0, 5).map((url) => (
                            <li key={url}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-2 hover:underline break-all"
                              >
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No market watches saved yet. Choose a brand and model above to see analytics here.
        </p>
      )}
    </div>
  );
}
