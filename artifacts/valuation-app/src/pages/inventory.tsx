import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useBatchRepriceCheck,
  useCreateInventoryItem,
  useGetBusinessReport,
  useListInventoryItems,
  usePatchInventoryItem,
  getListInventoryItemsQueryKey,
  getGetBusinessReportQueryKey,
} from "@workspace/api-client-react";
import { Package, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAGES = [
  "sourced",
  "purchased",
  "in_prep",
  "photographed",
  "listed",
  "offer_received",
  "sold",
  "unsold",
  "returned",
] as const;

export default function InventoryPage() {
  const { data: billing } = useBillingSummary();
  const pro = Boolean(billing?.canUseTraderWorkspace);
  const { data: items, refetch } = useListInventoryItems({
    query: { enabled: pro, queryKey: getListInventoryItemsQueryKey() },
  });
  const { data: report } = useGetBusinessReport(undefined, {
    query: { enabled: pro, queryKey: getGetBusinessReportQueryKey() },
  });
  const create = useCreateInventoryItem({ mutation: { onSuccess: () => void refetch() } });
  const patch = usePatchInventoryItem({ mutation: { onSuccess: () => void refetch() } });
  const reprice = useBatchRepriceCheck({
    mutation: {
      onSuccess: (rows) => {
        if (rows.length === 0) return;
        alert(rows.map((r) => `${r.title}: ${r.message}`).join("\n"));
      },
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof items>>();
    for (const s of STAGES) map.set(s, []);
    for (const item of items ?? []) {
      const arr = map.get(item.stage) ?? [];
      arr.push(item);
      map.set(item.stage, arr);
    }
    return map;
  }, [items]);

  if (!pro) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Inventory pipeline</h1>
        <p className="text-muted-foreground">
          Professional traders move stock from sourced → listed → sold with repricing alerts and margin tracking.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/settings">Upgrade to Professional</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Deal scoring, max buy price, and stage-based workflow for resale operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              reprice.mutate({
                data: { inventoryIds: (items ?? []).filter((i) => i.stage === "listed").map((i) => i.id) },
              })
            }
          >
            Batch repricing check
          </Button>
          <Button
            className="rounded-full"
            onClick={() => create.mutate({ data: { title: "New stock item", stage: "sourced" } })}
          >
            Add item
          </Button>
        </div>
      </header>

      {report ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Inventory value</p>
              <p className="text-xl font-semibold tabular-nums">{formatMoney(report.inventoryValue, "GBP")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Monthly profit</p>
              <p className="text-xl font-semibold tabular-nums">{formatMoney(report.monthlyProfit ?? 0, "GBP")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Slow movers</p>
              <p className="text-xl font-semibold tabular-nums">{report.slowMovingCount}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {STAGES.map((stage) => (
            <Card key={stage} className="w-64 shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{stage.replace(/_/g, " ")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(grouped.get(stage) ?? []).map((item) => (
                  <div key={item.id} className={cn("rounded-lg border border-border/60 p-2 text-sm")}>
                    <p className="font-medium">{item.title}</p>
                    {item.listPrice != null ? (
                      <p className="text-xs text-muted-foreground">List {formatMoney(item.listPrice, item.currency ?? "GBP")}</p>
                    ) : null}
                    {item.repriceHint ? <p className="mt-1 text-xs text-amber-700">{item.repriceHint}</p> : null}
                    <div className="mt-2 flex gap-1">
                      {STAGES.filter((s) => s !== stage)
                        .slice(0, 2)
                        .map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => patch.mutate({ id: item.id, data: { stage: s } })}
                          >
                            → {s.replace(/_/g, " ")}
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-lg"
                  onClick={() => create.mutate({ data: { title: `Item in ${stage}`, stage } })}
                >
                  +
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileDown className="h-5 w-5" />
            Business export
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tax and insurance stock rows are included in the Professional business report API for CSV export integrations.
        </CardContent>
      </Card>

      <div className="max-w-md">
        <LabelQuickAdd
          onAdd={(title) => create.mutate({ data: { title, stage: "purchased", costBasis: 0, listPrice: 0 } })}
        />
      </div>
    </div>
  );
}

function LabelQuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="flex gap-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quick add purchased stock" />
      <Button disabled={!title.trim()} onClick={() => { onAdd(title.trim()); setTitle(""); }}>
        Add
      </Button>
    </div>
  );
}
