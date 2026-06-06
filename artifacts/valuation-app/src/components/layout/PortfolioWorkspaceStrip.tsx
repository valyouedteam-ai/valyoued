import { PanelsTopLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Portfolio } from "@workspace/api-client-react";
import { usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";

export function portfolioWorkspaceButtonLabel(p: Portfolio, primaryLabel: string | null): string {
  return (
    p.label ||
    (p.purpose === "primary"
      ? primaryLabel ?? "Primary"
      : p.purpose === "pro_board"
        ? "Desk"
        : p.purpose === "inheritance"
          ? "Inheritance"
          : "Workspace")
  );
}

/**
 * Compact workspace switcher shown under the main app header when the user has more than one portfolio.
 */
export function PortfolioWorkspaceStrip() {
  const {
    portfolios,
    isLoading,
    activePortfolio,
    searchPortfolioId,
    selectPortfolioById,
  } = usePortfolioWorkspace();

  const primaryLabel = portfolios?.find((p) => p.purpose === "primary")?.label ?? null;

  if (isLoading || !portfolios || portfolios.length <= 1) return null;

  return (
    <div
      className="border-t border-border/50 bg-muted/25 px-4 py-2 sm:px-6"
      role="toolbar"
      aria-label="Portfolio workspace switcher"
      data-workspace-guide="workspace-strip"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-ui-caps text-muted-foreground">
          <PanelsTopLeft className="h-3.5 w-3.5 opacity-70" aria-hidden />
          Workspace
        </span>
        <div className="flex flex-wrap gap-1.5">
          {portfolios.map((p) => {
            const focused = activePortfolio?.id === p.id;
            return (
              <Button
                key={p.id}
                size="sm"
                type="button"
                variant={focused ? "default" : "outline"}
                className={cn(
                  "h-8 rounded-full px-3 text-xs",
                  focused && p.purpose === "inheritance"
                    ? "bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-600"
                    : focused && p.purpose === "pro_board"
                      ? "bg-teal-700 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-600"
                      : null,
                  !focused && p.purpose === "inheritance"
                    ? "border-violet-400/55 text-violet-900 hover:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/15"
                    : null,
                  !focused && p.purpose === "pro_board"
                    ? "border-teal-500/45 text-teal-900 hover:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/15"
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
        {searchPortfolioId && activePortfolio ? (
          <span className="text-[11px] text-muted-foreground sm:ml-auto">
            Viewing{" "}
            <span
              className={cn(
                "font-medium",
                activePortfolio.purpose === "inheritance"
                  ? "text-violet-800 dark:text-violet-300"
                  : activePortfolio.purpose === "pro_board"
                    ? "text-teal-800 dark:text-teal-300"
                    : "text-foreground",
              )}
            >
              {portfolioWorkspaceButtonLabel(activePortfolio, primaryLabel)}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
