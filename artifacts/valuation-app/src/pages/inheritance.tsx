import { Link, Redirect } from "wouter";
import { useEffect, useRef } from "react";
import { Briefcase, Calculator, Landmark, LibrarySquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import { useOptionalStubBillingPlanDev } from "@/context/StubBillingPlanDevContext";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { AUTH_STUB_MODE } from "@/lib/auth-stub";
import { isDevBillingUiEnabled } from "@/lib/dev-billing-ui";
import { cn } from "@/lib/utils";
import { portfolioWorkspaceButtonLabel } from "@/components/layout/PortfolioWorkspaceStrip";
import {
  ApiError,
  getListPortfoliosQueryKey,
  useCreatePortfolio,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function formatProvisionError(err: unknown): string {
  if (!err) return "";
  if (err instanceof ApiError) {
    const d = err.data;
    if (d && typeof d === "object" && "error" in d) {
      const msg = (d as { error?: unknown }).error;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
    return err.message.trim() || `HTTP ${err.status}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Dedicated hub for the inheritance ledger: explains how it differs from the primary portfolio,
 * links into workspace actions once the add-on is active, or Billing to enable it.
 *
 * With the dev Subscription strip, `/inheritance` redirects to `/dashboard` unless the inheritance toggle is on.
 * When add-on is active but the inheritance portfolio row has not been created yet, POST `/api/portfolios` is triggered once.
 */
export default function InheritancePage() {
  const queryClient = useQueryClient();
  const provisionAttemptedRef = useRef(false);
  const stubDev = useOptionalStubBillingPlanDev();

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

  const {
    mutate: provisionMutate,
    isPending: provisionPending,
    isError: provisionFailed,
    error: provisionError,
  } = useCreatePortfolio({
    mutation: {
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey: getListPortfoliosQueryKey() });
      },
    },
  });

  /** Clerk plus dev Subscription strip: billing fields are mocked in the browser while POST /api/portfolios stays real. */
  const clerkDevBillingStrip =
    Boolean(isDevBillingUiEnabled() && stubDev !== null && !AUTH_STUB_MODE);

  useEffect(() => {
    if (!hasAddon) {
      provisionAttemptedRef.current = false;
      return;
    }
    if (portfoliosLoading || portfolios == null) return;
    const hasRow = portfolios.some((p) => p.purpose === "inheritance");
    if (hasRow) return;
    if (provisionAttemptedRef.current || provisionPending) return;

    provisionAttemptedRef.current = true;
    provisionMutate({ data: { purpose: "inheritance" } });
  }, [hasAddon, portfoliosLoading, portfolios, provisionMutate, provisionPending]);

  const primaryLabel = portfolios?.find((p) => p.purpose === "primary")?.label ?? null;
  const inh = portfolios?.find((p) => p.purpose === "inheritance");
  const inhPortfolioQs =
    inh && (!primaryPortfolio || inh.id !== primaryPortfolio.id)
      ? `?portfolio=${encodeURIComponent(inh.id)}`
      : "";
  const inheritancePortfolioHref = inh
    ? inhPortfolioQs
      ? mergePortfolioHref("/dashboard", inhPortfolioQs)
      : "/dashboard"
    : mergePortfolioHref("/dashboard", portfolioQuerySuffix);

  const shouldRedirectAway = Boolean(isDevBillingUiEnabled() && stubDev !== null && !stubDev.inheritanceAddon);
  if (shouldRedirectAway) {
    return <Redirect to="/dashboard" />;
  }

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
                ? "Browse holdings, dashboards, or new valuations that stay scoped to this ledger."
                : provisionPending
                  ? "Creating your inheritance workspace on the server. This usually finishes in under a second."
                  : provisionFailed
                    ? "We could not create this workspace automatically. Use Retry after fixing the mismatch below."
                    : "Getting your inheritance workspace ready."}
            </CardDescription>
          </CardHeader>
          {provisionFailed ? (
            <div className="border-t px-6 py-4">
              <p className="text-sm font-medium text-destructive">Server response</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatProvisionError(provisionError) || "Request failed (no details from API)."}
              </p>
              {clerkDevBillingStrip ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  The Subscription strip changes this app only until the valuation API trusts{" "}
                  <span className="font-mono">X-Stub-Billing-Plan</span> and{" "}
                  <span className="font-mono">X-Stub-Inheritance-Addon</span>. From the repo root run{" "}
                  <span className="font-mono">pnpm dev</span>{" "}
                  (the API script sets{" "}
                  <span className="font-mono">NODE_ENV=development</span>, and the server keeps that even if{" "}
                  <span className="font-mono">.env.local</span> also sets production), or set{" "}
                  <span className="font-mono">ALLOW_DEV_STUB_BILLING_HEADERS=1</span> on a private local API build. Remote
                  production APIs always use real Billing.
                </p>
              ) : null}
            </div>
          ) : null}
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {inh ? (
              <>
                <Button asChild className="rounded-full gap-2">
                  <Link href={inheritancePortfolioHref}>
                    <Briefcase className="h-4 w-4" aria-hidden />
                    Open inheritance portfolio
                  </Link>
                </Button>
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
            ) : (
              <>
                <Button type="button" disabled className="rounded-full gap-2">
                  <Briefcase className="h-4 w-4" aria-hidden />
                  {provisionPending ? "Creating workspace…" : "Preparing workspace…"}
                </Button>
                {provisionFailed ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      void provisionMutate({ data: { purpose: "inheritance" } });
                    }}
                  >
                    Retry create workspace
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
