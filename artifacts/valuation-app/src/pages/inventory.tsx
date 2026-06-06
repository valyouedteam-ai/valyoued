import { useMemo } from "react";
import { Link } from "wouter";
import {
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useGetBusinessReport,
  useListInventoryItems,
  usePatchInventoryItem,
  getListInventoryItemsQueryKey,
  getGetBusinessReportQueryKey,
} from "@workspace/api-client-react";
import { Package, FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

type InventoryStage = (typeof STAGES)[number];

function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}

function adjacentStages(stage: InventoryStage): { prev?: InventoryStage; next?: InventoryStage } {
  const idx = STAGES.indexOf(stage);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? STAGES[idx - 1] : undefined,
    next: idx < STAGES.length - 1 ? STAGES[idx + 1] : undefined,
  };
}

function defaultItemTitle(stage: InventoryStage): string {
  return `New ${stageLabel(stage)} stock`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

function rowsToCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => {
    const text = value == null ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

function downloadCsv(filename: string, rows: ReadonlyArray<Record<string, unknown>>) {
  const csv = rowsToCsv(rows);
  triggerBlobDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export default function InventoryPage() {
  const { data: billing } = useBillingSummary();
  const pro = Boolean(billing?.canUseTraderWorkspace);
  const { toast } = useToast();
  const { data: items, refetch } = useListInventoryItems({
    query: { enabled: pro, queryKey: getListInventoryItemsQueryKey() },
  });
  const { data: report } = useGetBusinessReport(undefined, {
    query: { enabled: pro, queryKey: getGetBusinessReportQueryKey() },
  });
  const create = useCreateInventoryItem({ mutation: { onSuccess: () => void refetch() } });
  const patch = usePatchInventoryItem({ mutation: { onSuccess: () => void refetch() } });
  const del = useDeleteInventoryItem({ mutation: { onSuccess: () => void refetch() } });

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

  const exportMonth = report?.month ?? new Date().toISOString().slice(0, 7);

  const downloadTaxExport = () => {
    const rows = (report?.taxExportRows ?? []) as Record<string, unknown>[];
    if (rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Add inventory items first. Tax rows come from your pipeline stock.",
        variant: "destructive",
      });
      return;
    }
    downloadCsv(`valyoued-tax-export-${exportMonth}.csv`, rows);
    toast({ title: "Tax export ready", description: "Your CSV download should begin shortly." });
  };

  const downloadInsuranceExport = () => {
    const rows = (report?.insuranceStockRows ?? []) as Record<string, unknown>[];
    if (rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Save valuations to your portfolio first. Insurance rows come from those holdings.",
        variant: "destructive",
      });
      return;
    }
    downloadCsv(`valyoued-insurance-stock-${exportMonth}.csv`, rows);
    toast({ title: "Insurance stock export ready", description: "Your CSV download should begin shortly." });
  };

  const downloadAllExports = () => {
    const taxRows = (report?.taxExportRows ?? []) as Record<string, unknown>[];
    const insuranceRows = (report?.insuranceStockRows ?? []) as Record<string, unknown>[];
    if (taxRows.length === 0 && insuranceRows.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Add inventory items or saved valuations before exporting.",
        variant: "destructive",
      });
      return;
    }
    if (taxRows.length > 0) downloadCsv(`valyoued-tax-export-${exportMonth}.csv`, taxRows);
    if (insuranceRows.length > 0) {
      window.setTimeout(
        () => downloadCsv(`valyoued-insurance-stock-${exportMonth}.csv`, insuranceRows),
        taxRows.length > 0 ? 350 : 0,
      );
    }
    toast({ title: "Exports started", description: "One or two CSV files should download momentarily." });
  };

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
        <Button
          className="rounded-full"
          onClick={() => create.mutate({ data: { title: "New stock item", stage: "sourced" } })}
        >
          Add item
        </Button>
      </header>

      {report ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <CardDescription className="text-sm font-medium">Inventory value</CardDescription>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(report.inventoryValue, "GBP")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <CardDescription className="text-sm font-medium">Monthly profit</CardDescription>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(report.monthlyProfit ?? 0, "GBP")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <CardDescription className="text-sm font-medium">Slow movers</CardDescription>
              <p className="mt-1 text-xl font-semibold tabular-nums">{report.slowMovingCount}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {STAGES.map((stage) => (
            <Card key={stage} className="w-64 shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{stageLabel(stage)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(grouped.get(stage) ?? []).map((item) => (
                  <div
                    key={item.id}
                    className={cn("group rounded-lg border border-border/60 p-2 text-sm")}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-medium">{item.title}</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={`Delete ${item.title}`}
                        disabled={del.isPending}
                        onClick={() => del.mutate({ id: item.id })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {item.listPrice != null ? (
                      <p className="text-xs text-muted-foreground">List {formatMoney(item.listPrice, item.currency ?? "GBP")}</p>
                    ) : null}
                    {item.repriceHint ? <p className="mt-1 text-xs text-amber-700">{item.repriceHint}</p> : null}
                    <div className="mt-2 flex gap-1">
                      {(() => {
                        const { prev, next } = adjacentStages(stage);
                        return (
                          <>
                            {prev ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[10px]"
                                onClick={() => patch.mutate({ id: item.id, data: { stage: prev } })}
                              >
                                ← {stageLabel(prev)}
                              </Button>
                            ) : null}
                            {next ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[10px]"
                                onClick={() => patch.mutate({ id: item.id, data: { stage: next } })}
                              >
                                → {stageLabel(next)}
                              </Button>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-lg"
                  onClick={() => create.mutate({ data: { title: defaultItemTitle(stage), stage } })}
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
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download tax and inventory pipeline rows plus insurance stock from your saved valuations as CSV files.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-full" disabled={!report} onClick={downloadAllExports}>
              Download all CSVs
            </Button>
            <Button type="button" variant="outline" className="rounded-full" disabled={!report} onClick={downloadTaxExport}>
              Tax & inventory
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={!report}
              onClick={downloadInsuranceExport}
            >
              Insurance stock
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
