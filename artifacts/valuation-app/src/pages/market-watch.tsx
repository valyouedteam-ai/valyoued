import { useState } from "react";
import { Link } from "wouter";
import {
  useCreateMarketWatch,
  useDeleteMarketWatch,
  useListMarketWatches,
  getListMarketWatchesQueryKey,
} from "@workspace/api-client-react";
import { LineChart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const SEED_TAXONOMY = [
  { assetClass: "Cars", label: "BMW 3 Series 2018-2020", brand: "BMW", model: "3 Series", yearFrom: 2018, yearTo: 2020 },
  { assetClass: "Luxury Bags", label: "Chanel Classic Flap", brand: "Chanel", model: "Classic Flap" },
  { assetClass: "Electronics", label: "iPhone Pro models", brand: "Apple", model: "iPhone Pro" },
  { assetClass: "Watches", label: "Rolex Datejust", brand: "Rolex", model: "Datejust" },
];

export default function MarketWatchPage() {
  const { data: billing } = useBillingSummary();
  const pro = Boolean(billing?.canUseTraderWorkspace);
  const { toast } = useToast();
  const { data: watches, isLoading, refetch } = useListMarketWatches({
    query: { enabled: pro, queryKey: getListMarketWatchesQueryKey() },
  });
  const create = useCreateMarketWatch({
    mutation: {
      onSuccess: () => {
        void refetch();
        toast({ title: "Watch created", description: "ValYoued analytics snapshot is ready." });
      },
    },
  });
  const del = useDeleteMarketWatch({ mutation: { onSuccess: () => void refetch() } });

  const [assetClass, setAssetClass] = useState("Luxury Bags");
  const [label, setLabel] = useState("");

  if (!pro) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
        <LineChart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Market Watch</h1>
        <p className="text-muted-foreground">
          Professional traders track class-level price trends, sold comps, and buy-below targets here.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/settings">Upgrade to Professional</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Market Watch</h1>
        <p className="max-w-2xl text-muted-foreground">
          Track by class, brand, and model (BMW 3 Series, Chanel Classic Flap). Uses comp archive snapshots for now.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create watch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Asset class</Label>
            <Select value={assetClass} onValueChange={setAssetClass}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Cars", "Luxury Bags", "Electronics", "Watches"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Chanel Classic Flap medium" />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {SEED_TAXONOMY.map((seed) => (
              <Button
                key={seed.label}
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  create.mutate({
                    data: {
                      assetClass: seed.assetClass,
                      label: seed.label,
                      brand: seed.brand,
                      model: seed.model,
                      yearFrom: seed.yearFrom,
                      yearTo: seed.yearTo,
                    },
                  })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {seed.label}
              </Button>
            ))}
          </div>
          <Button
            className="sm:col-span-2 rounded-full"
            disabled={!label.trim() || create.isPending}
            onClick={() => create.mutate({ data: { assetClass, label: label.trim() } })}
          >
            Save custom watch
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(watches ?? []).map((w) => (
            <Card key={w.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{w.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">{w.assetClass}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete watch"
                  onClick={() => del.mutate({ id: w.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground">Suggested list</p>
                    <p className="font-semibold tabular-nums">{formatMoney(w.snapshot.suggestedListingPrice, "GBP")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Buy below</p>
                    <p className="font-semibold tabular-nums">{formatMoney(w.snapshot.buyBelowPrice, "GBP")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg days to sell</p>
                    <p className="font-semibold">{w.snapshot.avgDaysToSell}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Best platform</p>
                    <p className="font-semibold">{w.snapshot.bestPlatform}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{w.snapshot.analyticsNote}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
