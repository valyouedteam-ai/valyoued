import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  useCreateMarketWatch,
  useDeleteMarketWatch,
  useListMarketWatches,
  getListMarketWatchesQueryKey,
} from "@workspace/api-client-react";
import { LineChart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

function marketWatchErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.data as { error?: string } | undefined;
    if (typeof body?.error === "string" && body.error.trim()) return body.error;
    return err.message;
  }
  return err instanceof Error ? err.message : "Could not save this watch.";
}

export default function MarketWatchPage() {
  const { data: billing } = useBillingSummary();
  const pro = Boolean(billing?.canUseTraderWorkspace);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: watches, isLoading } = useListMarketWatches({
    query: { enabled: pro, queryKey: getListMarketWatchesQueryKey() },
  });

  const refreshWatches = async () => {
    await queryClient.invalidateQueries({ queryKey: getListMarketWatchesQueryKey() });
  };

  const create = useCreateMarketWatch({
    mutation: {
      onSuccess: async () => {
        setLabel("");
        await refreshWatches();
        toast({ title: "Watch created", description: "ValYoued analytics snapshot is ready." });
      },
      onError: (err) => {
        toast({
          title: "Could not save watch",
          description: marketWatchErrorMessage(err),
          variant: "destructive",
        });
      },
    },
  });
  const del = useDeleteMarketWatch({
    mutation: {
      onSuccess: () => void refreshWatches(),
      onError: (err) => {
        toast({
          title: "Could not delete watch",
          description: marketWatchErrorMessage(err),
          variant: "destructive",
        });
      },
    },
  });

  const [assetClass, setAssetClass] = useState("Luxury Bags");
  const [label, setLabel] = useState("");

  const saveCustomWatch = () => {
    const trimmed = label.trim();
    if (!trimmed || create.isPending) return;
    create.mutate({ data: { assetClass, label: trimmed } });
  };

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
        <p className="text-muted-foreground leading-relaxed">
          Create watches for the asset classes and labels you follow. Each watch summarizes suggested list prices,
          buy-below targets, resale timing, and platform hints from our comp archive. Snapshots for now, not live
          market feeds.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create watch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="market-watch-asset-class">Asset class</Label>
            <Select value={assetClass} onValueChange={setAssetClass}>
              <SelectTrigger id="market-watch-asset-class">
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
            <Label htmlFor="market-watch-label">Label</Label>
            <Input
              id="market-watch-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Chanel Classic Flap medium"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveCustomWatch();
                }
              }}
            />
          </div>
          <Button
            type="button"
            className="sm:col-span-2 rounded-full"
            disabled={!label.trim() || create.isPending}
            onClick={saveCustomWatch}
          >
            {create.isPending ? "Saving…" : "Save custom watch"}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : watches?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {watches.map((w) => (
            <Card key={w.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{w.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">{w.assetClass}</p>
                </div>
                <Button
                  type="button"
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
      ) : (
        <p className="text-sm text-muted-foreground">No watches yet. Save one above to see analytics here.</p>
      )}
    </div>
  );
}
