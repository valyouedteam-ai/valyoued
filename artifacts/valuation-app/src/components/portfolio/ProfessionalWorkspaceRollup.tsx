import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getListPortfoliosQueryKey,
  useCreatePortfolio,
  type EstimateSummary,
  type Portfolio,
} from "@workspace/api-client-react";
import { convertToUsdApprox } from "@workspace/fx-usd";
import { PanelsTopLeft, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";
import { useOptionalStubBillingPlanDev } from "@/context/StubBillingPlanDevContext";
import { portfolioWorkspaceButtonLabel } from "@/components/layout/PortfolioWorkspaceStrip";
import { AUTH_STUB_MODE } from "@/lib/auth-stub";
import { isDevBillingUiEnabled } from "@/lib/dev-billing-ui";
import { cn } from "@/lib/utils";

function estimateInWorkspace(
  e: EstimateSummary,
  workspaceId: string | null,
  primaryId: string | null,
): boolean {
  if (!workspaceId || !primaryId) return true;
  if (workspaceId === primaryId) return !e.portfolioId || e.portfolioId === primaryId;
  return e.portfolioId === workspaceId;
}

function purposeWorkspaceKind(purpose: Portfolio["purpose"]): string {
  if (purpose === "primary") return "Primary shelf";
  if (purpose === "pro_board") return "Trading desk";
  if (purpose === "inheritance") return "Inheritance";
  return "Workspace";
}

function openWorkspaceHref(primaryId: string | null | undefined, workspaceId: string): string {
  if (primaryId && workspaceId === primaryId) return "/portfolio";
  return mergePortfolioHref("/portfolio", `?portfolio=${encodeURIComponent(workspaceId)}`);
}

type ProfessionalWorkspaceRollupProps = {
  estimateRows: EstimateSummary[];
  /** Display-formatter for cross-currency rollups using the user's reference currency from Settings. */
  formatRollup: (usd: number) => string;
  fxMult: Readonly<Record<string, number>> | null | undefined;
};

/**
 * Professional plan: cross-workspace counts and approximate totals, plus create additional trading desks.
 */
export function ProfessionalWorkspaceRollup({
  estimateRows,
  formatRollup,
  fxMult,
}: ProfessionalWorkspaceRollupProps) {
  const { data: billing } = useBillingSummary();
  const professionalPlan = billing?.planSlug === "professional";
  const stubDev = useOptionalStubBillingPlanDev();
  const clerkDevBillingStrip =
    Boolean(isDevBillingUiEnabled() && stubDev !== null && !AUTH_STUB_MODE);
  const { portfolios, primaryPortfolio, activePortfolio, selectPortfolioById } = usePortfolioWorkspace();
  const primaryLabel = portfolios?.find((p) => p.purpose === "primary")?.label ?? null;
  const primaryId = primaryPortfolio?.id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deskDialogOpen, setDeskDialogOpen] = useState(false);
  const [newDeskLabel, setNewDeskLabel] = useState("");

  const createDesk = useCreatePortfolio({
    mutation: {
      onSuccess: async (created) => {
        await queryClient.invalidateQueries({ queryKey: getListPortfoliosQueryKey() });
        setDeskDialogOpen(false);
        setNewDeskLabel("");
        selectPortfolioById(created.id);
        toast({
          title: "Trading desk added",
          description:
            "We opened your new workspace. Saved valuations stay on this desk until you switch workspaces.",
        });
      },
      onError: (err: unknown) => {
        let msg = err instanceof Error ? err.message : String(err ?? "");
        if (clerkDevBillingStrip && err instanceof ApiError && err.status === 403) {
          msg =
            `${msg} The Subscription strip only simulates billing in the browser until the valuation API trusts stub billing headers. From the repo root run pnpm dev (API in development mode), or set ALLOW_DEV_STUB_BILLING_HEADERS=1 on a private local API.`;
        }
        toast({
          title: "Could not create desk",
          description: msg || "Confirm your Professional plan is active, then try again.",
          variant: "destructive",
        });
      },
    },
  });

  const rows = useMemo(() => {
    if (!portfolios?.length) return [];
    return portfolios.map((p) => {
      const scoped = estimateRows.filter((e) => estimateInWorkspace(e, p.id, primaryId));
      const totalUsd = scoped.reduce((s, e) => s + convertToUsdApprox(e.adjustedMid, e.currency, fxMult), 0);
      return {
        id: p.id,
        displayLabel: portfolioWorkspaceButtonLabel(p, primaryLabel),
        purpose: p.purpose,
        itemCount: scoped.length,
        totalUsd,
      };
    });
  }, [estimateRows, fxMult, portfolios, primaryId, primaryLabel]);

  const combined = useMemo(() => {
    const totalUsd = estimateRows.reduce((s, e) => s + convertToUsdApprox(e.adjustedMid, e.currency, fxMult), 0);
    return { itemCount: estimateRows.length, totalUsd };
  }, [estimateRows, fxMult]);

  if (!professionalPlan || !portfolios?.length) return null;

  const deskCount = portfolios.filter((p) => p.purpose === "pro_board").length;

  return (
    <>
      <Card className="border-teal-500/25 bg-gradient-to-br from-teal-500/[0.05] via-transparent to-transparent">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PanelsTopLeft className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden />
              Workspaces overview
            </CardTitle>
            <CardDescription>
              Professional plan separates stock into multiple portfolios (primary shelf plus one or more trading desks).
              Open a row for detail view, then use valuations or folders below for that ledger only.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-teal-500/35 bg-teal-500/[0.06] hover:bg-teal-500/12"
            onClick={() => {
              setNewDeskLabel("");
              setDeskDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add trading desk
          </Button>
        </CardHeader>
        <CardContent className="space-y-0 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pl-4 pr-3 font-medium sm:pl-5">Workspace</th>
                <th className="pb-3 pr-3 font-medium">Kind</th>
                <th className="pb-3 pr-3 font-medium tabular-nums">Items</th>
                <th className="pb-3 pr-3 font-medium tabular-nums">Approx. total</th>
                <th className="pb-3 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const active = activePortfolio?.id === row.id;
                return (
                  <tr
                    key={row.id}
                    className={cn("border-b border-border/40", active && "bg-teal-500/[0.06] dark:bg-teal-950/30")}
                  >
                    <td className="py-3 pl-4 pr-3 font-medium text-foreground sm:pl-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate max-w-[200px] sm:max-w-none">{row.displayLabel}</span>
                        {active ? (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            Viewing
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{purposeWorkspaceKind(row.purpose)}</td>
                    <td className="py-3 pr-3 tabular-nums text-muted-foreground">{row.itemCount}</td>
                    <td className="py-3 pr-3 font-sans tabular-nums text-foreground">{formatRollup(row.totalUsd)}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8" asChild>
                        <Link href={openWorkspaceHref(primaryId, row.id)}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/40 font-medium">
                <td className="py-3 pl-4 pr-3 text-foreground sm:pl-5">All workspaces combined</td>
                <td className="py-3 pr-3 text-muted-foreground"> </td>
                <td className="py-3 pr-3 tabular-nums text-foreground">{combined.itemCount}</td>
                <td className="py-3 pr-3 font-sans tabular-nums text-foreground">{formatRollup(combined.totalUsd)}</td>
                <td className="py-3" />
              </tr>
            </tbody>
          </table>
          {deskCount === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              You only have a primary shelf so far. Add a trading desk to split lanes (for example by region, category, or
              consignment batch).
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={deskDialogOpen} onOpenChange={setDeskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add trading desk</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="new-desk-label">Desk name</Label>
            <Input
              id="new-desk-label"
              value={newDeskLabel}
              onChange={(e) => setNewDeskLabel(e.target.value)}
              placeholder="e.g. EU luxury lane"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Creates another <span className="font-medium text-foreground">Trading desk</span> portfolio so you can
              attach valuations separately. Pick the workspace when you reach the Region step in the wizard, or use the
              workspace picker under the navigation bar.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeskDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createDesk.isPending}
              onClick={() => {
                const nextIndex = deskCount + 1;
                const labelTrim = newDeskLabel.trim();
                createDesk.mutate({
                  data: {
                    purpose: "pro_board",
                    label: labelTrim !== "" ? labelTrim : `Trading desk ${nextIndex}`,
                  },
                });
              }}
            >
              {createDesk.isPending ? "Creating…" : "Create desk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
