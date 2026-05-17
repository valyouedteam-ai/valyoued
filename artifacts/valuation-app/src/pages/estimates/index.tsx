import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { FileText, ArrowRight, AlertCircle, Plus } from "lucide-react";
import { useListEstimates } from "@workspace/api-client-react";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function EstimatesPage() {
  const { data: estimates, isLoading } = useListEstimates();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-sans font-bold text-foreground">Recent Estimates</h1>
          <p className="text-muted-foreground mt-1">History of appraised assets across the network.</p>
        </div>
        <Link href="/estimate/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : !estimates || estimates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-xl bg-card/30">
          <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-xl font-sans mb-2">No estimates found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            You haven't run any valuations yet. Create your first estimate to see market analysis.
          </p>
          <Link href="/estimate/new">
            <Button size="lg">Create Estimate</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {estimates.map((est) => (
            <Link key={est.id} href={`/estimates/${est.id}`}>
              <div className="group flex items-center justify-between p-5 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-accent/40 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-sans text-lg text-foreground group-hover:text-accent transition-colors">{est.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                      <Badge variant="secondary" className="font-sans text-xs rounded-sm bg-secondary text-secondary-foreground">{est.assetTypeName}</Badge>
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-border"></span>
                        {formatDistanceToNow(new Date(est.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right hidden sm:flex flex-col items-end">
                  <div className="text-xl font-sans font-bold text-foreground">
                    {formatMoney(est.adjustedMid, est.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span className="uppercase tracking-wider">Top Market:</span>
                    <span className="font-medium text-foreground">{est.bestArbitrageRegion}</span>
                  </div>
                </div>
                
                <div className="sm:hidden text-accent">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
