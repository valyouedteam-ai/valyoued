import { Link } from "wouter";
import { Briefcase, Calculator, Landmark, LibrarySquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { cn } from "@/lib/utils";
import { portfolioWorkspaceButtonLabel } from "@/components/layout/PortfolioWorkspaceStrip";

/**
 * Dedicated hub for the inheritance ledger: explains how it differs from the primary portfolio,
 * links into the workspace after the add-on is active, or routes people to Billing to enable it.
 */
export default function InheritancePage() {
  const { data: billing } = useBillingSummary();
  const hasAddon = Boolean(billing?.hasInheritanceAddon);
  const {
    portfolios,
    isLoading: portfoliosLoading,
    portfolioQuerySuffix,
    activePortfolio,
    primaryPortfolio,
    selectPortfolioById,
  } = usePortfolioWorkspace();

  const primaryLabel = portfolios?.find((p) => p.purpose === "primary")?.label ?? null;
  const inh = portfolios?.find((p) => p.purpose === "inheritance");
  /** Query string forcing the inheritance ledger when it is not the primary id. */
  const inhPortfolioQs =
    inh && primaryPortfolio && inh.id !== primaryPortfolio.id ? `?portfolio=${encodeURIComponent(inh.id)}` : "";
  const inheritancePortfolioHref = inh
    ? inhPortfolioQs
      ? mergePortfolioHref("/portfolio", inhPortfolioQs)
      : "/portfolio"
    : mergePortfolioHref("/portfolio", portfolioQuerySuffix);

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-16">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <Landmark className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700/90 dark:text-violet-400/90">
              Inheritance workspace
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              A ledger separate from your main portfolio
            </h1>
          </div>
        </div>
        <p className="max-w-none text-base leading-relaxed text-muted-foreground">
          Manage your everyday holdings alongside a second workspace intended for{" "}
          <span className="font-medium text-foreground">family planning</span>,{" "}
          <span className="font-medium text-foreground">estate organisation</span>, or valuables you catalogue for heirs
          and estates you support. Valuations saved here stay grouped so reports and dashboards do not mingle with assets you
          personally keep.
        </p>
      </header>

      <Card className="border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-transparent">
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle className="text-lg">How it behaves in ValYoued</CardTitle>
          <CardDescription>
            You switch workspaces from the pills under the top navigation bar. Inheritance-focused screens use violet
            hints so it is obvious which ledger you are in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-2 pl-0.5 marker:text-violet-600">
            <li>Your primary dashboard and portfolio listings show only valuations attached to each workspace.</li>
            <li>When you run a valuation, pick <span className="font-medium text-foreground">portfolio workspace</span> on{' '}
              the Region step so the asset lands on the ledger you intend.</li>
            <li>The inheritance workspace is billed as an optional add-on in Settings when you need it permanently.</li>
          </ul>
        </CardContent>
      </Card>

      {!portfoliosLoading && portfolios != null && portfolios.length > 1 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Switch workspace</p>
          <div className="flex flex-wrap gap-2">
            {portfolios.map((p) => {
              const focused = activePortfolio?.id === p.id;
              return (
                <Button
                  key={p.id}
                  size="sm"
                  type="button"
                  variant={focused ? "default" : "outline"}
                  className={cn(
                    "rounded-full",
                    focused && p.purpose === "inheritance"
                      ? "bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-600"
                      : null,
                    !focused && p.purpose === "inheritance"
                      ? "border-violet-400/55 text-violet-900 hover:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/15"
                      : null,
                  )}
                  aria-pressed={focused}
                  onClick={() => selectPortfolioById(p.id)}
                >
                  {portfolioWorkspaceButtonLabel(p, primaryLabel)}
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Matches the strips on Home and under the navigation bar for quick context switching anywhere in the app.
          </p>
        </div>
      ) : portfoliosLoading ? (
        <Skeleton className="h-16 w-full max-w-xl rounded-xl" />
      ) : null}

      {!hasAddon ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
              Enable the inheritance add-on
            </CardTitle>
            <CardDescription>
              Turn on Billing to create your separate inheritance ledger. You can undo later; we move valuations back onto
              your primary portfolio before closing the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link href="/settings#inheritance-addon">Open Billing and inheritance add-on</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/pricing">See plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-accent/35">
          <CardHeader>
            <CardTitle className="text-lg">Your inheritance portfolio</CardTitle>
            <CardDescription>
              {inh
                ? "Open the full holdings view scoped to heirlooms, estate rehearsal, or non-owned items you track."
                : "We provision the workspace alongside your billing state. Reload in a moment if it is still syncing."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {inh ? (
              <Button asChild className="rounded-full gap-2">
                <Link href={inheritancePortfolioHref}>
                  <Briefcase className="h-4 w-4" aria-hidden />
                  Open inheritance portfolio
                </Link>
              </Button>
            ) : (
              <Button type="button" disabled className="rounded-full gap-2">
                <Briefcase className="h-4 w-4" aria-hidden />
                Waiting for inheritance workspace
              </Button>
            )}
            {inh && inhPortfolioQs ? (
              <>
                <Button asChild variant="outline" className="rounded-full gap-2">
                  <Link href={mergePortfolioHref("/dashboard", inhPortfolioQs)}>
                    <LibrarySquare className="h-4 w-4" aria-hidden />
                    Dashboard in this workspace
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full gap-2">
                  <Link href={mergePortfolioHref("/estimate/new", inhPortfolioQs)}>
                    <Calculator className="h-4 w-4" aria-hidden />
                    Valuate into inheritance
                  </Link>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
