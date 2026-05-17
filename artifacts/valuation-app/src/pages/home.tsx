import { Link } from "wouter";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useListAssetTypes, useGetEstimateStats } from "@workspace/api-client-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  Calculator,
  ChevronRight,
  Globe2,
  Layers,
  Sparkles,
  AlertCircle,
  BarChart3,
  DollarSign,
  MapPin,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { AssetCategoriesLoadHint } from "@/lib/asset-categories-fetch-hint";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "snapshot", label: "Snapshot" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "catalog", label: "Catalog" },
  { id: "ready", label: "Ready" },
] as const;

const quickLinks = [
  {
    href: "/estimate/new",
    title: "New valuation",
    desc: "Run the guided form with photo assist and get a full report.",
    icon: Calculator,
    emphasis: true as const,
  },
  {
    href: "/portfolio",
    title: "Portfolio",
    desc: "See diversification, shelves, and rolling USD totals.",
    icon: Layers,
    emphasis: false as const,
  },
  {
    href: "/markets",
    title: "Cross-market",
    desc: "Regional signals and deep links into each dossier.",
    icon: Globe2,
    emphasis: false as const,
  },
] as const;

export default function HomePage() {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const progressPct = ((step + 1) / total) * 100;

  const {
    data: assetTypes,
    isLoading: loadingTypes,
    isError: assetTypesQueryError,
    error: assetTypesErr,
    refetch: refetchAssetTypes,
  } = useListAssetTypes();
  const { data: stats, isLoading: statsLoading } = useGetEstimateStats();

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

  const topRegion = stats?.topArbitrageRegions?.[0];
  const distinctAssetClasses = stats?.byAssetType?.length ?? 0;

  const goNext = () => setStep((s) => Math.min(s + 1, total - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const restart = () => setStep(0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 pb-16 pt-2 sm:pt-6">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-ui-caps">Home</span>
          </div>
          {step > 0 ? (
            <button
              type="button"
              onClick={restart}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Start over
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Step {step + 1} of {total}
            </span>
            <span className="font-medium text-foreground">{STEPS[step].label}</span>
          </div>
          <Progress value={progressPct} className="h-1.5 bg-muted" aria-hidden />
          <ol className="flex flex-wrap gap-1.5 sm:gap-2" aria-label="Tour progress">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors sm:text-xs",
                    i === step
                      ? "bg-accent text-accent-foreground"
                      : i < step
                        ? "bg-muted text-muted-foreground hover:bg-muted/80"
                        : "bg-muted/40 text-muted-foreground/70 hover:bg-muted/60",
                  )}
                >
                  {i + 1}. {s.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="min-h-[320px] sm:min-h-[360px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={STEPS[step].id}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={cn(step === 4 ? "space-y-6 text-center" : step === 0 ? "space-y-6" : "space-y-5")}
          >
            {step === 0 ? (
              <>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                  Welcome to your valuation workspace
                </h1>
                <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  A short guided tour covers your stats, shortcuts, and what we can value. You can jump to any
                  step from the chips above whenever you like.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    1
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Snapshot</span> — see how many dossiers you have
                    and how they behave in the aggregate.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    2
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Shortcuts</span> — jump straight to valuations,
                    portfolio, or cross-market views.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    3
                  </span>
                  <span>
                    <span className="font-medium text-foreground">Catalog</span> — browse asset classes we model
                    before you commit to a form.
                  </span>
                </li>
              </ul>
              </>
            ) : null}

            {step === 1 ? (
              <>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Your snapshot</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Rolled up from valuations on your account (USD approximations via the FX table). For charts and
                  breakdowns, open analytics anytime.
                </p>
              </div>
              <Link
                href="/stats"
                className="inline-flex items-center text-sm font-medium text-accent hover:underline"
              >
                Open full analytics
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
              <div className="grid gap-3 sm:grid-cols-2">
                {statsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
                ) : (
                  <>
                    <Card className="border-border/70 bg-card/80 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Valuations</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-semibold tabular-nums tracking-tight">
                          {stats && stats.count > 0 ? stats.count : "—"}
                        </p>
                        <CardDescription className="mt-1 text-xs">
                          {stats && stats.count > 0
                            ? `${distinctAssetClasses} class${distinctAssetClasses === 1 ? "" : "es"} represented`
                            : "Create one to see numbers here"}
                        </CardDescription>
                      </CardContent>
                    </Card>
                    <Card className="border-border/70 bg-card/80 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. adjusted</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-semibold tabular-nums tracking-tight">
                          {stats && stats.count > 0 ? formatCurrency(stats.averageAdjustedUsd) : "—"}
                        </p>
                        <CardDescription className="mt-1 text-xs">Mean midpoint</CardDescription>
                      </CardContent>
                    </Card>
                    <Card className="border-border/70 bg-card/80 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. uplift</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-semibold tabular-nums tracking-tight">
                          {stats && stats.count > 0 ? formatPercent(stats.averageUplift, true) : "—"}
                        </p>
                        <CardDescription className="mt-1 text-xs">Adjusted vs. baseline (mean)</CardDescription>
                      </CardContent>
                    </Card>
                    <Card className="border-border/70 bg-card/80 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top market</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-semibold leading-snug tracking-tight">
                          {stats && stats.count > 0 && topRegion ? topRegion.region : "—"}
                        </p>
                        <CardDescription className="mt-1 text-xs">
                          {stats && stats.count > 0 && topRegion
                            ? `${topRegion.count} dossier${topRegion.count === 1 ? "" : "s"} lean here`
                            : "Shows once you have data"}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Where to next</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Pick a destination now, or continue the tour — you can always reach these from the nav.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Card
                        className={cn(
                          "group border-border/70 transition-all hover:border-accent/30 hover:shadow-md",
                          item.emphasis ? "border-accent/25 bg-card ring-1 ring-accent/10" : "bg-card/80",
                        )}
                      >
                        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                          <div
                            className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                              item.emphasis ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                              {item.title}
                            </h3>
                            <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Supported asset classes</h2>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    We model many collectibles and alternative assets. Expand a category to see specific types
                    before you start a valuation.
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 rounded-full font-normal">
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
                        <AlertDescription className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              </>
            ) : null}

            {step === 4 ? (
              <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
                <CheckCircle2 className="h-7 w-7" aria-hidden />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  You&apos;re set
                </h2>
                <p className="mx-auto max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Start a valuation when you&apos;re ready, or revisit any step using the progress chips above.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/estimate/new">
                  <Button size="lg" className="rounded-full px-8 shadow-sm">
                    <Calculator className="mr-2 h-4 w-4" />
                    New valuation
                  </Button>
                </Link>
                <Link href="/portfolio">
                  <Button size="lg" variant="outline" className="rounded-full px-8">
                    Open portfolio
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                <Link href="/stats" className="font-medium text-accent hover:underline">
                  Analytics
                </Link>
                <span className="mx-2 text-border">·</span>
                <Link href="/markets" className="font-medium text-accent hover:underline">
                  Markets
                </Link>
                <span className="mx-2 text-border">·</span>
                <Link href="/estimates" className="font-medium text-accent hover:underline">
                  All estimates
                </Link>
              </p>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="mt-auto flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="order-2 sm:order-1"
          onClick={goBack}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step < total - 1 ? (
          <Button type="button" className="order-1 w-full rounded-full sm:order-2 sm:w-auto" onClick={goNext}>
            {step === 3 ? "Finish tour" : "Continue"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="order-1 w-full rounded-full sm:order-2 sm:w-auto"
            onClick={restart}
          >
            Run tour again
          </Button>
        )}
      </footer>
    </div>
  );
}
