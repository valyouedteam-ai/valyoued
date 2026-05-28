import { Link } from "wouter";
import { ArrowRight, Compass, Sparkles, Wallet } from "lucide-react";
import type { EstimateSummary } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import {
  HOME_BUCKET_LABEL,
  HOME_BUCKET_ORDER,
  type HomeBucketKey,
  bucketForAssetTypeName,
  countItemsByBucket,
} from "@/lib/home-buckets";
import { cn } from "@/lib/utils";

const BUCKET_ASSET_HINT: Partial<Record<HomeBucketKey, { tier: "luxury" | "everyday"; assetTypeId?: string }>> = {
  luxuryBags: { tier: "luxury", assetTypeId: "designer-handbag" },
  jewellery: { tier: "luxury", assetTypeId: "fine-jewelry" },
  cars: { tier: "everyday", assetTypeId: "car" },
  electronics: { tier: "everyday", assetTypeId: "smartphone" },
  clothing: { tier: "luxury", assetTypeId: "sneakers" },
  collectibles: { tier: "luxury", assetTypeId: "trading-cards" },
};

function buildEstimateNewHref(
  portfolioQuerySuffix: string,
  bucket?: HomeBucketKey,
): string {
  const params = new URLSearchParams();
  if (portfolioQuerySuffix.startsWith("?")) {
    const existing = new URLSearchParams(portfolioQuerySuffix.slice(1));
    existing.forEach((v, k) => params.set(k, v));
  }
  if (bucket) {
    params.set("bucket", bucket);
    const hint = BUCKET_ASSET_HINT[bucket];
    if (hint?.tier) params.set("tier", hint.tier);
    if (hint?.assetTypeId) params.set("assetType", hint.assetTypeId);
  }
  const qs = params.toString();
  return mergePortfolioHref(qs ? `/estimate/new?${qs}` : "/estimate/new", "");
}

export function DashboardNextStep({ scopedEstimates }: { scopedEstimates: EstimateSummary[] }) {
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const { data: billing } = useBillingSummary();
  const bucketCounts = countItemsByBucket(scopedEstimates.map((e) => e.assetTypeName));
  const paid = Boolean(billing?.hasPaidValuationTier);

  let title = "Run your first valuation";
  let body = "Capture an item once, then revisit the range and listing draft whenever you need them.";
  let href = buildEstimateNewHref(portfolioQuerySuffix);
  let cta = "Start valuation";
  let icon = Sparkles;

  if (scopedEstimates.length > 0) {
    const emptyBucket = HOME_BUCKET_ORDER.find((k) => bucketCounts[k] === 0);
    if (emptyBucket) {
      title = `Add your first ${HOME_BUCKET_LABEL[emptyBucket].toLowerCase()} item`;
      body = "Buckets stay empty until you save a valuation tagged like that asset class.";
      href = buildEstimateNewHref(portfolioQuerySuffix, emptyBucket);
      cta = "Add item";
      icon = Wallet;
    } else if (!paid) {
      title = "Unlock regional arbitrage rows";
      body = "Everyday+ adds fuller market grids on each report plus monitor emails.";
      href = "/pricing#plans";
      cta = "Compare plans";
      icon = Compass;
    } else {
      title = "Review regional pricing context";
      body = "Open Markets to see where your saved runs cluster by region.";
      href = mergePortfolioHref("/markets", portfolioQuerySuffix);
      cta = "Open Markets";
      icon = Compass;
    }
  }

  const Icon = icon;

  return (
    <section
      className={cn(
        "rounded-2xl border border-accent/25 bg-[hsl(var(--dashboard-surface-elevated))] p-5 shadow-sm",
        "sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6",
      )}
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
      <Button size="lg" className="mt-4 w-full shrink-0 rounded-full sm:mt-0 sm:w-auto" asChild>
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </section>
  );
}

export function bucketFilterForEstimates(
  estimates: EstimateSummary[],
  bucket: HomeBucketKey,
): EstimateSummary[] {
  return estimates.filter((e) => bucketForAssetTypeName(e.assetTypeName) === bucket);
}

export { buildEstimateNewHref };
