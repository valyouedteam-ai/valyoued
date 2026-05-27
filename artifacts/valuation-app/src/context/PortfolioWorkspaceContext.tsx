import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useListPortfolios, type Portfolio } from "@workspace/api-client-react";
import { useLocation, useSearch } from "wouter";

export type PortfolioPurpose = Portfolio["purpose"];

export type PortfolioWorkspaceContextValue = {
  portfolios: Portfolio[] | undefined;
  isLoading: boolean;
  activePortfolio: Portfolio | null;
  /** Only the `purpose === "primary"` row; null if absent (never inferred from `portfolios[0]`). */
  primaryPortfolio: Portfolio | null;
  /** Raw `portfolio` URL param when present (drives workspace strip "Viewing …" hints). */
  searchPortfolioId: string | null;
  portfolioQuerySuffix: string;
  selectPortfolioById: (id: string) => void;
};

const PortfolioWorkspaceContext = createContext<PortfolioWorkspaceContextValue | null>(
  null,
);

/** Append active workspace query to internal links (preserve existing search params when possible). */
export function mergePortfolioHref(href: string, portfolioQuerySuffix: string): string {
  if (!portfolioQuerySuffix || href.startsWith("http")) return href;
  const q = portfolioQuerySuffix.startsWith("?") ? portfolioQuerySuffix.slice(1) : portfolioQuerySuffix;
  if (!q) return href;
  return href.includes("?") ? `${href}&${q}` : `${href}?${q}`;
}

export function PortfolioWorkspaceProvider({ children }: { children: ReactNode }) {
  const [pathname, navigate] = useLocation();
  const search = useSearch();
  const { data: portfolios, isLoading } = useListPortfolios();

  const primaryPortfolio = portfolios?.find((p) => p.purpose === "primary") ?? null;

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const searchPortfolioId = useMemo(() => {
    const raw = searchParams.get("portfolio")?.trim();
    return raw ? raw : null;
  }, [searchParams]);

  const activePortfolio = useMemo(() => {
    if (!portfolios?.length) return null;
    if (!searchPortfolioId) return primaryPortfolio ?? portfolios[0] ?? null;
    const hit = portfolios.find((p) => p.id === searchPortfolioId);
    return hit ?? primaryPortfolio ?? portfolios[0] ?? null;
  }, [portfolios, searchPortfolioId, primaryPortfolio]);

  const portfolioQuerySuffix = useMemo(() => {
    if (!activePortfolio) return "";
    const primaryId = primaryPortfolio?.id ?? null;
    if (primaryId != null && activePortfolio.id === primaryId) return "";
    const firstId = portfolios?.[0]?.id ?? null;
    if (primaryId == null && firstId != null && activePortfolio.id === firstId) return "";
    return `?portfolio=${encodeURIComponent(activePortfolio.id)}`;
  }, [activePortfolio, primaryPortfolio, portfolios]);

  const selectPortfolioById = useCallback(
    (id: string) => {
      const qs = new URLSearchParams(search);
      const primary = portfolios?.find((p) => p.purpose === "primary");
      const defaultWorkspaceId = primary?.id ?? portfolios?.[0]?.id ?? null;
      if (!defaultWorkspaceId || id === defaultWorkspaceId) {
        qs.delete("portfolio");
      } else if (portfolios?.some((p) => p.id === id)) {
        qs.set("portfolio", id);
      }
      const suffix = qs.toString();
      navigate(suffix ? `${pathname}?${suffix}` : pathname);
    },
    [navigate, pathname, portfolios, search],
  );

  const value = useMemo<PortfolioWorkspaceContextValue>(
    () => ({
      portfolios,
      isLoading,
      activePortfolio,
      primaryPortfolio,
      searchPortfolioId,
      portfolioQuerySuffix,
      selectPortfolioById,
    }),
    [
      portfolios,
      isLoading,
      activePortfolio,
      primaryPortfolio,
      searchPortfolioId,
      portfolioQuerySuffix,
      selectPortfolioById,
    ],
  );

  return (
    <PortfolioWorkspaceContext.Provider value={value}>
      {children}
    </PortfolioWorkspaceContext.Provider>
  );
}

export function usePortfolioWorkspace(): PortfolioWorkspaceContextValue {
  const ctx = useContext(PortfolioWorkspaceContext);
  if (!ctx) {
    throw new Error("usePortfolioWorkspace must be used within PortfolioWorkspaceProvider");
  }
  return ctx;
}

/** Safe optional hook: returns null outside the provider for pages that rarely need it. */
export function tryUsePortfolioWorkspace(): PortfolioWorkspaceContextValue | null {
  return useContext(PortfolioWorkspaceContext);
}
