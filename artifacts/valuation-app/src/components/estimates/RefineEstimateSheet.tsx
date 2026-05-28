import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetEstimateQueryKey,
  getListEstimatesQueryKey,
  useRefineEstimate,
} from "@workspace/api-client-react";
import type { EstimateResult } from "@workspace/api-client-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function RefineEstimateSheet({
  estimate,
  open,
  onOpenChange,
}: {
  estimate: EstimateResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const analytics = estimate.portfolioAnalytics;
  const [brand, setBrand] = useState(estimate.input.brand ?? "");
  const [model, setModel] = useState(estimate.input.model ?? "");
  const [year, setYear] = useState(estimate.input.year != null ? String(estimate.input.year) : "");
  const [purchasePrice, setPurchasePrice] = useState(
    estimate.input.purchasePrice != null ? String(estimate.input.purchasePrice) : "",
  );
  const [condition, setCondition] = useState(String(estimate.input.condition ?? 5));
  const [attributes, setAttributes] = useState(estimate.input.attributes ?? "");

  const refine = useRefineEstimate({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetEstimateQueryKey(estimate.id), data);
        void queryClient.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
        const delta =
          (data.portfolioAnalytics?.confidenceScore ?? 0) - (analytics?.confidenceScore ?? 0);
        toast({
          title: "Valuation refined",
          description:
            delta > 0
              ? `Confidence improved by ${delta} points. Range and comps refreshed.`
              : "Range and comps refreshed with your updates.",
        });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({
          title: "Could not refine",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      },
    },
  });

  function submit() {
    refine.mutate({
      id: estimate.id,
      data: {
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year.trim() ? Number(year) : undefined,
        purchasePrice: purchasePrice.trim() ? Number(purchasePrice) : undefined,
        condition: Number(condition),
        attributes: attributes.trim() || undefined,
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Improve accuracy</SheetTitle>
          <SheetDescription>
            Add details you skipped earlier. Confidence today: {analytics?.confidenceScore ?? "n/a"}/100.
          </SheetDescription>
        </SheetHeader>

        {analytics?.fieldCompleteness ? (
          <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
            <p className="font-medium text-foreground">Completed ({analytics.fieldCompleteness.pct}%)</p>
            <p className="text-muted-foreground">{analytics.fieldCompleteness.completed.slice(0, 6).join(", ")}</p>
            {analytics.fieldCompleteness.missing.length > 0 ? (
              <>
                <p className="mt-2 font-medium text-foreground">Still missing</p>
                <p className="text-accent">{analytics.fieldCompleteness.missing.join(", ")}</p>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="refine-brand">Brand</Label>
              <Input id="refine-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refine-model">Model</Label>
              <Input id="refine-model" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="refine-year">Year</Label>
              <Input id="refine-year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refine-condition">Condition /10</Label>
              <Input
                id="refine-condition"
                inputMode="numeric"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refine-price">Purchase price</Label>
            <Input
              id="refine-price"
              inputMode="decimal"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refine-attrs">Receipts, flaws, completeness</Label>
            <Textarea
              id="refine-attrs"
              rows={4}
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
              placeholder="Box, papers, receipt copy, service history..."
            />
          </div>
          <Button className="w-full rounded-full" disabled={refine.isPending} onClick={submit}>
            {refine.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Re-run valuation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
