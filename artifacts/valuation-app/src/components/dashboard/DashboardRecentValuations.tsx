import { useMemo, useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { EstimateSummary, PatchEstimateBodyIntent } from "@workspace/api-client-react";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { HomeBucketKey } from "@/lib/home-buckets";
import { HOME_BUCKET_LABEL, bucketForAssetTypeName } from "@/lib/home-buckets";

type IntentFilterKey = "all" | PatchEstimateBodyIntent | "unset";
type ShelfFilterKey = "all" | EstimateSummary["portfolioShelf"];

export function DashboardRecentValuations({
  scopedEstimates,
  estimatesLoading,
  activeBucket,
  onClearBucketFilter,
}: {
  scopedEstimates: EstimateSummary[];
  estimatesLoading: boolean;
  activeBucket?: HomeBucketKey | null;
  onClearBucketFilter?: () => void;
}) {
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const [intentFilter, setIntentFilter] = useState<IntentFilterKey>("all");
  const [shelfFilter, setShelfFilter] = useState<ShelfFilterKey>("all");

  const sortedRecent = useMemo(
    () => [...scopedEstimates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [scopedEstimates],
  );

  const displayedRecent = useMemo(() => {
    return sortedRecent.filter((e) => {
      if (activeBucket && bucketForAssetTypeName(e.assetTypeName) !== activeBucket) return false;
      if (shelfFilter !== "all" && e.portfolioShelf !== shelfFilter) return false;
      if (intentFilter === "all") return true;
      if (intentFilter === "unset") return !e.intent;
      return e.intent === intentFilter;
    });
  }, [sortedRecent, shelfFilter, intentFilter, activeBucket]);

  function resetFilters() {
    setIntentFilter("all");
    setShelfFilter("all");
    onClearBucketFilter?.();
  }

  return (
    <section id="recent-valuations" className="scroll-mt-28 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Shelf</span>
          <ToggleGroup
            type="single"
            value={shelfFilter}
            variant="outline"
            size="sm"
            className="flex-wrap justify-start"
            onValueChange={(v) => {
              if (!v || v === "all") {
                setShelfFilter("all");
                return;
              }
              if (v === "everyday" || v === "luxury" || v === "other") setShelfFilter(v);
            }}
          >
            <ToggleGroupItem value="all" className="rounded-full px-3 text-xs">
              All shelves
            </ToggleGroupItem>
            <ToggleGroupItem value="everyday" className="rounded-full px-3 text-xs">
              Everyday
            </ToggleGroupItem>
            <ToggleGroupItem value="luxury" className="rounded-full px-3 text-xs">
              Luxury
            </ToggleGroupItem>
            <ToggleGroupItem value="other" className="rounded-full px-3 text-xs">
              Other
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Intent</span>
          <ToggleGroup
            type="single"
            value={intentFilter}
            variant="outline"
            size="sm"
            className="flex-wrap justify-start"
            onValueChange={(v) => {
              if (
                v === "" ||
                v === "all" ||
                v === "sell" ||
                v === "monitor" ||
                v === "hold" ||
                v === "unset"
              ) {
                setIntentFilter(v === "" ? "all" : (v as IntentFilterKey));
              }
            }}
          >
            <ToggleGroupItem value="all" className="rounded-full px-3 text-xs">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="hold" className="rounded-full px-3 text-xs">
              Hold
            </ToggleGroupItem>
            <ToggleGroupItem value="monitor" className="rounded-full px-3 text-xs">
              Monitor
            </ToggleGroupItem>
            <ToggleGroupItem value="sell" className="rounded-full px-3 text-xs">
              Prep sell
            </ToggleGroupItem>
            <ToggleGroupItem value="unset" className="rounded-full px-3 text-xs">
              No intent
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
          {intentFilter !== "all" || shelfFilter !== "all" || activeBucket ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => resetFilters()}
            >
              Clear filters
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {estimatesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : displayedRecent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing matches those filters yet.{" "}
              {intentFilter !== "all" || shelfFilter !== "all" || activeBucket ? (
                <button
                  type="button"
                  className="font-medium text-accent underline-offset-4 hover:underline"
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              ) : null}
              {intentFilter === "all" && shelfFilter === "all" && !activeBucket ? (
                <>
                  {" "}
                  <Link
                    href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Run a valuation
                  </Link>
                  .
                </>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
              {displayedRecent.map((e) => (
                <li key={e.id}>
                  <div className="flex flex-col gap-2 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={mergePortfolioHref(`/estimates/${e.id}`, portfolioQuerySuffix)}
                      className="min-w-0 flex-1 px-1 text-sm outline-none ring-offset-background transition-colors hover:text-accent focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-accent/40 sm:py-0.5"
                    >
                      <div className="truncate font-medium text-foreground">{e.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 truncate text-xs text-muted-foreground">
                        <span>{HOME_BUCKET_LABEL[bucketForAssetTypeName(e.assetTypeName)]}</span>
                        <span className="rounded-full bg-muted px-2 py-px text-[10px] uppercase tracking-wide">
                          {e.portfolioShelf}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          Adj. {formatMoney(e.adjustedMid, e.currency, true)}
                        </span>
                      </div>
                    </Link>
                    <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:text-right">
                      {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
