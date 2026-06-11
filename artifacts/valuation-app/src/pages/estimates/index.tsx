import { useMemo } from "react";
import { Link, useSearch } from "wouter";
import { Plus } from "lucide-react";
import { useListEstimates } from "@workspace/api-client-react";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";
import { estimateInActiveWorkspace } from "@/lib/portfolio-workspace-scope";
import { DashboardRecentValuations } from "@/components/dashboard/DashboardRecentValuations";
import { buildEstimateNewHref } from "@/components/dashboard/DashboardNextStep";
import { Button } from "@/components/ui/button";
import type { HomeBucketKey } from "@/lib/home-buckets";
import { HOME_BUCKET_ORDER } from "@/lib/home-buckets";
import { PageTitle } from "@/components/layout/PageTitle";

function parseBucketFilter(search: string): HomeBucketKey | null {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const val = new URLSearchParams(q).get("bucket");
  if (val && (HOME_BUCKET_ORDER as readonly string[]).includes(val)) {
    return val as HomeBucketKey;
  }
  return null;
}

export default function EstimatesPage() {
  const search = useSearch();
  const { portfolioQuerySuffix, activePortfolio, primaryPortfolio } = usePortfolioWorkspace();
  const { data: estimates, isLoading } = useListEstimates();

  const activeBucket = useMemo(() => parseBucketFilter(search), [search]);

  const scopedRows = useMemo(() => {
    const rows = Array.isArray(estimates) ? estimates : [];
    const act = activePortfolio?.id ?? null;
    const prim = primaryPortfolio?.id ?? null;
    return rows.filter((e) => estimateInActiveWorkspace(e, act, prim));
  }, [estimates, activePortfolio?.id, primaryPortfolio?.id]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>Recent valuations</PageTitle>
          <p className="mt-1 text-muted-foreground">
            Saved runs for this workspace, newest first. Filter by shelf, intent, or asset bucket.
          </p>
        </div>
        <Button asChild>
          <Link href={buildEstimateNewHref(portfolioQuerySuffix)}>
            <Plus className="mr-2 h-4 w-4" />
            New valuation
          </Link>
        </Button>
      </div>

      <DashboardRecentValuations
        scopedEstimates={scopedRows}
        estimatesLoading={isLoading}
        activeBucket={activeBucket}
        onClearBucketFilter={() => {
          window.history.replaceState(null, "", mergePortfolioHref("/estimates", portfolioQuerySuffix));
        }}
      />
    </div>
  );
}
