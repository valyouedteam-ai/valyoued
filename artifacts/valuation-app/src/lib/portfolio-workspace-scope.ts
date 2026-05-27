import type { EstimateSummary } from "@workspace/api-client-react";

/**
 * Whether a saved estimate should show in portfolio-style UIs for the active workspace.
 * `primaryWorkspaceId` must be the id of the `purpose === "primary"` row only (never a legacy `portfolios[0]` guess),
 * otherwise inheritance and desks can be misclassified as the primary ledger and every workspace shows the same items.
 */
export function estimateInActiveWorkspace(
  e: Pick<EstimateSummary, "portfolioId">,
  activeWorkspaceId: string | null,
  primaryWorkspaceId: string | null,
): boolean {
  if (!activeWorkspaceId) return true;

  if (!primaryWorkspaceId) {
    return e.portfolioId === activeWorkspaceId;
  }

  if (activeWorkspaceId === primaryWorkspaceId) {
    return !e.portfolioId || e.portfolioId === primaryWorkspaceId;
  }

  return e.portfolioId === activeWorkspaceId;
}
