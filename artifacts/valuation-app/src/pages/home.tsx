import { Link } from "wouter";
import { useMemo } from "react";
import { useListAssetTypes, useListEstimates } from "@workspace/api-client-react";
import { formatMoney } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  FileText,
  Globe2,
  Layers,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AssetCategoriesLoadHint } from "@/lib/asset-categories-fetch-hint";

const quickLinks = [
  {
    href: "/estimate/new",
    title: "New valuation",
    desc: "Structured form, photo assist, instant report.",
    icon: Calculator,
    emphasis: true as const,
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    desc: "Diversification with converted roll-up totals.",
    icon: Layers,
    emphasis: false as const,
  },
  {
    href: "/markets",
    title: "Cross-market",
    desc: "Regional hints and links into each dossier.",
    icon: Globe2,
    emphasis: false as const,
  },
];

export default function HomePage() {
  const {
    data: assetTypes,
    isLoading: loadingTypes,
    isError: assetTypesQueryError,
    error: assetTypesErr,
    refetch: refetchAssetTypes,
  } = useListAssetTypes();
  const { data: estimates, isLoading: loadingEstimates } = useListEstimates();

  /** Succeeds HTTP 200 but body is not an array (e.g. HTML string when SPA serves /api/*). */
  const assetTypesMalformed =
    !loadingTypes &&
    !assetTypesQueryError &&
    assetTypes != null &&
    !Array.isArray(assetTypes);

  const showAssetTypesError = assetTypesQueryError || assetTypesMalformed;
  const assetTypesDisplayErr: unknown = assetTypesMalformed
    ? new Error(
        "The catalog response was not a JSON array. If the UI is on Vercel or another static host, set VITE_API_ORIGIN to your valuation API origin (no trailing slash) so /api/asset-types hits the backend.",
      )
    : assetTypesErr;

  const assetTypesErrMessage =
    assetTypesDisplayErr instanceof Error
      ? assetTypesDisplayErr.message
      : String(assetTypesDisplayErr ?? "Unknown error");

  const estimateRows = useMemo(
    () => (Array.isArray(estimates) ? estimates : []),
    [estimates],
  );

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
    <div className="space-y-14 pb-8">
      <section className="space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-ui-caps text-muted-foreground">ValYoued workspace</p>
            <h1 className="whitespace-nowrap text-[clamp(0.8125rem,calc((100vw-2rem)/22),2rem)] font-semibold leading-tight tracking-tight text-foreground md:leading-[1.08]">
              Price with context.{" "}
              <span className="text-muted-foreground font-normal">Act with clarity.</span>
            </h1>
          </div>
          <Link href="/stats" className="shrink-0">
            <Button variant="outline" className="rounded-full border-border/80 shadow-sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              Portfolio analytics
            </Button>
          </Link>
        </div>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg text-balance w-full">
          One place for valuations, portfolio view, and marketplace-ready drafts, tuned for collectibles and
          alternative assets.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card
                  className={`group h-full border-border/70 transition-all hover:shadow-md ${
                    item.emphasis
                      ? "border-accent/25 bg-card ring-1 ring-accent/10"
                      : "bg-card/80 hover:border-accent/20"
                  }`}
                >
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        item.emphasis ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="font-semibold tracking-tight text-foreground group-hover:text-accent transition-colors">
                        {item.title}
                      </h2>
                      <p className="text-sm leading-snug text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="flex items-center text-sm font-medium text-accent">
                      Open
                      <ChevronRight className="ml-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Asset classes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse what we support. Expand a category to see types.
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full font-normal">
            <Sparkles className="mr-1 h-3 w-3" />
            {assetTypeRows.length > 0 ? `${assetTypeRows.length} types` : "Catalog"}
          </Badge>
        </div>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardContent className="p-0">
            {loadingTypes ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : showAssetTypesError ? (
              <div className="p-5">
                <Alert variant="destructive" className="border-destructive/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Couldn&apos;t load asset classes</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-balance text-sm">{assetTypesErrMessage}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void refetchAssetTypes()}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                  <AssetCategoriesLoadHint error={assetTypesDisplayErr} />
                </Alert>
              </div>
            ) : assetTypesByCategory.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                No asset classes returned. Check <span className="font-mono text-xs">/api/asset-types</span>.
              </p>
            ) : (
              <Accordion type="multiple" className="divide-y divide-border/60">
                {assetTypesByCategory.map(([category, types]) => (
                  <AccordionItem key={category} value={category} className="border-0 px-5">
                    <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                      <span className="flex items-center gap-2">
                        {category}
                        <span className="text-xs font-normal text-muted-foreground">
                          {types.length} type{types.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0 text-sm leading-relaxed text-muted-foreground">
                      {types.map((t, i) => (
                        <span key={t.id ?? `${category}-${i}`}>
                          <span title={t.tagline ?? undefined} className="text-foreground/90">
                            {t.name ?? "Unnamed"}
                          </span>
                          {i < types.length - 1 ? <span className="text-border"> · </span> : null}
                        </span>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent activity</h2>
          <Link
            href="/estimates"
            className="inline-flex items-center text-sm font-medium text-accent hover:underline"
          >
            All valuations
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {loadingEstimates ? (
          <div className="space-y-3">
            <Skeleton className="h-[4.5rem] w-full rounded-xl" />
            <Skeleton className="h-[4.5rem] w-full rounded-xl" />
          </div>
        ) : estimateRows.length === 0 ? (
          <Card className="border-dashed border-border/80 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No valuations yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Run a first pass. You&apos;ll see it here with value and best region.
              </p>
              <Link href="/estimate/new" className="mt-6">
                <Button className="rounded-full">Start valuation</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {estimateRows.slice(0, 5).map((est) => (
              <li key={est.id}>
                <Link href={`/estimates/${est.id}`}>
                  <div className="group flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm transition-all hover:border-accent/25 hover:shadow sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground group-hover:text-accent transition-colors">
                          {est.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-md text-[10px] font-medium">
                            {est.assetTypeName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(est.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums">
                        {formatMoney(est.adjustedMid, est.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Best region · {est.bestArbitrageRegion || "N/A"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
