import { Link } from "wouter";
import { useMemo } from "react";
import { useListAssetTypes, useListEstimates } from "@workspace/api-client-react";
import { formatMoney } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Calculator, FileText, Globe2, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssetCategoriesLoadHint } from "@/lib/asset-categories-fetch-hint";

export default function HomePage() {
  const {
    data: assetTypes,
    isLoading: loadingTypes,
    isError: assetTypesQueryError,
    error: assetTypesErr,
    refetch: refetchAssetTypes,
  } = useListAssetTypes();
  const { data: estimates, isLoading: loadingEstimates } = useListEstimates();

  const assetTypesErrMessage =
    assetTypesErr instanceof Error ? assetTypesErr.message : String(assetTypesErr ?? "Unknown error");

  const estimateRows = useMemo(
    () => (Array.isArray(estimates) ? estimates : []),
    [estimates],
  );

  /** Plain objects only — if `assetTypes` is mistakenly a string, iterating would walk characters and yield bogus rows. */
  const assetTypeRows = useMemo(() => {
    if (!Array.isArray(assetTypes)) return [];
    return assetTypes.filter(
      (t): t is (typeof assetTypes)[number] => t != null && typeof t === "object",
    );
  }, [assetTypes]);

  const assetTypesByCategory = useMemo(() => {
    if (!assetTypeRows.length) return [];
    const map = new Map<string, typeof assetTypeRows>();
    for (const t of assetTypeRows) {
      const key =
        typeof t.category === "string" && t.category.trim() !== "" ? t.category : "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries())
      .map(
        ([category, types]) =>
          [
            category,
            [...types].sort((a, b) =>
              (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }),
            ),
          ] as const,
      )
      .sort(([a], [b]) => (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" }));
  }, [assetTypeRows]);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="space-y-6 pt-8">
        <h1 className="text-5xl md:text-7xl font-sans leading-[1.1] text-foreground">
          Know the market. <br />
          <span className="italic text-muted-foreground">Before you enter it.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-sans text-pretty">
          Know what your collectibles are worth, from watches and wine to cars, art, and more. ValYoued pulls together live market context, comparable sales, and regional buyer demand so you can set a fair price and see where it might sell best.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-4 flex-wrap">
          <Link href="/estimate/new">
            <Button size="lg" className="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
              <Calculator className="mr-2 h-5 w-5" />
              Start Valuation
            </Button>
          </Link>
          <Link href="/stats">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent border-border/50 hover:bg-card">
              <TrendingUp className="mr-2 h-5 w-5" />
              View Market Stats
            </Button>
          </Link>
          <Link href="/markets">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent border-border/50 hover:bg-card">
              <Globe2 className="mr-2 h-5 w-5" />
              Cross-market insights
            </Button>
          </Link>
        </div>
      </section>

      {/* Asset classes (compact reference) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight font-sans">Supported asset classes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Grouped by category. Start a valuation to choose a specific class and enter details.
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3">
          {loadingTypes ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-muted/50 w-full max-w-xl" />
              ))}
            </div>
          ) : assetTypesQueryError ? (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Couldn&apos;t load asset classes</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-balance text-sm">
                  {assetTypesErrMessage}
                  <AssetCategoriesLoadHint error={assetTypesErr} />
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/40"
                  onClick={() => void refetchAssetTypes()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : assetTypesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No asset classes were returned. If the API is still starting, wait a moment and refresh; otherwise check the
              server catalog and <span className="font-mono text-xs">/api/asset-types</span>.
            </p>
          ) : (
            <dl className="space-y-3 text-sm">
              {assetTypesByCategory.map(([category, types]) => (
                <div
                  key={category}
                  className="flex flex-col gap-1 sm:flex-row sm:gap-6 sm:items-start border-b border-border/40 pb-3 last:border-0 last:pb-0"
                >
                  <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-44 sm:pt-0.5">
                    {category}
                  </dt>
                  <dd className="min-w-0 text-foreground/90 leading-relaxed">
                    {types.map((t, i) => (
                      <span key={t.id ?? `asset-${category}-${i}`}>
                        <span title={t.tagline ?? undefined} className="cursor-default">
                          {t.name ?? "Unnamed type"}
                        </span>
                        {i < types.length - 1 ? <span className="text-muted-foreground">, </span> : null}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Recent Estimates Strip */}
      <section className="space-y-6 border-t border-border pt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-sans">Recent Market Activity</h2>
          <Link href="/estimates" className="text-sm font-medium text-accent hover:underline inline-flex items-center">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {loadingEstimates ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : estimateRows.length === 0 ? (
          <Card className="bg-card/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-sans mb-1">No estimates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Run your first valuation to see market activity.</p>
              <Link href="/estimate/new">
                <Button variant="outline" size="sm">Create Estimate</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {estimateRows.slice(0, 5).map((est) => (
              <Link key={est.id} href={`/estimates/${est.id}`}>
                <div className="group flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-accent/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">{est.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        <Badge variant="secondary" className="font-mono text-[10px] rounded-sm">{est.assetTypeName}</Badge>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(est.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="font-mono font-medium">{formatMoney(est.adjustedMid, est.currency)}</div>
                    <div className="text-xs text-muted-foreground font-mono">Best: {est.bestArbitrageRegion}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
