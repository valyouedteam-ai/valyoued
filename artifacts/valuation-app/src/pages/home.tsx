import { useMemo } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { EstimateSummary } from "@workspace/api-client-react";
import {
  listEstimates,
  useGetEstimateStats,
  useListEstimates,
} from "@workspace/api-client-react";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { useSellerPersonaClerkSync } from "@/hooks/use-persona-sync";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProPreviewToggle } from "@/components/ProPreviewToggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Calculator,
  ChevronRight,
  FileText,
  Globe2,
  Lock,
  Megaphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";

function inActiveWorkspace(
  e: EstimateSummary,
  activeId: string | null,
  primaryId: string | null,
): boolean {
  if (!activeId || !primaryId) return true;
  if (activeId === primaryId) return !e.portfolioId || e.portfolioId === primaryId;
  return e.portfolioId === activeId;
}

export default function HomePage() {
  useSellerPersonaClerkSync();

  const { data: billing } = useBillingSummary();
  const paid = billing?.hasPaidValuationTier;
  const slug = billing?.planSlug ?? "none";
  const isProfessionalFlavor = slug === "professional";

  const { portfolioQuerySuffix, activePortfolio, primaryPortfolio } = usePortfolioWorkspace();
  const { data: estimates, isLoading: estLoading } = useListEstimates({
    query: {
      staleTime: 30_000,
    } as unknown as UseQueryOptions<Awaited<ReturnType<typeof listEstimates>>, Error>,
  });

  const { data: stats, isLoading: statsLoading } = useGetEstimateStats();

  const filtered = useMemo(() => {
    const rows = Array.isArray(estimates) ? estimates : [];
    const act = activePortfolio?.id ?? null;
    const prim = primaryPortfolio?.id ?? null;
    return rows.filter((e) => inActiveWorkspace(e, act, prim));
  }, [estimates, activePortfolio?.id, primaryPortfolio?.id]);

  const recentValuations = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [filtered]);

  const workspaceLabel =
    activePortfolio?.label ??
    (activePortfolio?.purpose === "pro_board" ? "Professional desk" : null);

  const quickLinks: Array<{
    href: string;
    title: string;
    description: string;
    icon: typeof Briefcase;
  }> = [
    {
      href: mergePortfolioHref("/portfolio", portfolioQuerySuffix),
      title: "Portfolio",
      description: "Holdings, totals, shelf layout, and listing shortcuts.",
      icon: Briefcase,
    },
    {
      href: mergePortfolioHref("/estimates", portfolioQuerySuffix),
      title: "Estimate archive",
      description: "Full history with filters and search.",
      icon: FileText,
    },
    {
      href: mergePortfolioHref("/markets", portfolioQuerySuffix),
      title: "Markets",
      description: "Regional arbitrage and FX-backed previews.",
      icon: Globe2,
    },
    {
      href: mergePortfolioHref("/listings", portfolioQuerySuffix),
      title: "Listings",
      description: "Drafts and marketplace wording.",
      icon: Megaphone,
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3 max-w-2xl">
          {workspaceLabel ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <Badge variant="outline" className="rounded-full px-3 py-0.5">
                Workspace
              </Badge>
              <span className="text-foreground/80">{workspaceLabel}</span>
            </div>
          ) : null}
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Home
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            {isProfessionalFlavor
              ? "Jump into desks and tools from here. Portfolio keeps the live ledger, folders, and shelf breakdown for each workspace."
              : "Quick links and a short list of recent valuations. For live totals, mix charts, and the full holdings list, use Portfolio."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProPreviewToggle label="Pro mode" />
          <Button size="lg" className="rounded-full shadow-lg" asChild>
            <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>
              <Calculator className="mr-2 h-5 w-5" />
              New valuation
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full" asChild>
            <Link href={mergePortfolioHref("/portfolio", portfolioQuerySuffix)}>
              <Briefcase className="mr-2 h-5 w-5" />
              Open portfolio
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group rounded-2xl border border-border/60 bg-card/55 p-4 shadow-sm backdrop-blur-sm transition-colors",
              "hover:border-accent/35 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1 font-medium leading-tight">
                  {title}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-xs leading-snug text-muted-foreground">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section>
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent valuations</CardTitle>
            <CardDescription>
              Newest saves in{" "}
              <span className="text-foreground/90">{workspaceLabel ?? "this workspace"}</span>.
              Portfolio lists everything with live ticks and folders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {estLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : recentValuations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No valuations in this workspace yet.{" "}
                <Link
                  href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}
                  className="font-medium text-accent underline-offset-4 hover:underline"
                >
                  Run your first
                </Link>{" "}
                or open{" "}
                <Link
                  href={mergePortfolioHref("/portfolio", portfolioQuerySuffix)}
                  className="font-medium text-accent underline-offset-4 hover:underline"
                >
                  Portfolio
                </Link>
                .
              </div>
            ) : (
              <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
                {recentValuations.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={mergePortfolioHref(`/estimates/${e.id}`, portfolioQuerySuffix)}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{e.title}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {e.assetTypeName}
                          {e.intent ? (
                            <span className="ml-2 rounded-full bg-muted px-2 py-px text-[10px] uppercase tracking-wide">
                              {e.intent}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className={cn(!paid && "relative overflow-hidden")}>
          {!paid ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-md">
              <Lock className="h-8 w-8 text-accent" aria-hidden />
              <p className="max-w-[18rem] text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                International arbitrage previews require Everyday+ or Professional
              </p>
              <Button asChild size="sm">
                <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>See billing</Link>
              </Button>
            </div>
          ) : null}
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Regional markets cockpit</CardTitle>
            </div>
            <CardDescription>Weighted by your valuation mix. Open Markets for fuller tables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : stats?.topArbitrageRegions?.length ? (
              (() => {
                const rows = stats.topArbitrageRegions;
                const total = rows.reduce((s, r) => s + (r.count ?? 0), 0) || 1;
                return (
                  <div className="space-y-2 text-sm">
                    {rows.slice(0, 4).map((r) => (
                      <div key={r.region} className="flex items-center justify-between gap-4">
                        <span className="truncate text-muted-foreground">{r.region}</span>
                        <span className="tabular-nums font-medium">
                          {formatPercent((r.count ?? 0) / total)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">Regional spread appears once you have more valuations.</p>
            )}
            <Button variant="outline" className="w-full justify-between rounded-xl" asChild>
              <Link href={mergePortfolioHref("/markets", portfolioQuerySuffix)}>
                Dive into markets
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={cn(!paid && "relative overflow-hidden")}>
          {!paid ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-md">
              <Sparkles className="h-8 w-8 text-accent" aria-hidden />
              <p className="max-w-[18rem] text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Monitor intents + paid-tier listing tone unlock with Everyday+
              </p>
              <Button asChild size="sm">
                <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>Enable perks</Link>
              </Button>
            </div>
          ) : null}
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Monitor & monetize rails</CardTitle>
            </div>
            <CardDescription>Listing drafts · monitor intents · email knobs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/listings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Listing drafts</span>
                <span className="text-xs text-muted-foreground">Marketplace wording</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Email alerts</span>
                <span className="text-xs text-muted-foreground">Tune monitor emails</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
