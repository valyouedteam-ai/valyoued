import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, Eye, Tag, LayoutGrid } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { iconForAssetType } from "@/lib/asset-icons";
import { formatMoney } from "@/lib/format";

export type FolderId = "hold" | "monitor" | "sell" | "uncategorized";

const STORAGE_KEY = "valyoued.portfolioFolders.v1";

export interface FolderItem {
  id: string;
  title: string;
  assetTypeName: string;
  liveValue: number;
  currency: string;
}

interface FolderMap {
  [estimateId: string]: FolderId;
}

function loadFolders(): FolderMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FolderMap) : {};
  } catch {
    return {};
  }
}

function saveFolders(map: FolderMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* localStorage may be unavailable */
  }
}

const FOLDER_DEFS: Array<{
  id: Exclude<FolderId, "uncategorized">;
  title: string;
  blurb: string;
  Icon: typeof TrendingUp;
  stripe: string;
  iconMuted: string;
  dropActive: string;
}> = [
  {
    id: "hold",
    title: "Hold",
    blurb: "Long-term keepers you are happy to tuck away.",
    Icon: TrendingUp,
    stripe: "border-l-emerald-500/80",
    iconMuted: "text-emerald-600/85 dark:text-emerald-400/90",
    dropActive: "ring-2 ring-emerald-500/35 bg-emerald-500/[0.04]",
  },
  {
    id: "monitor",
    title: "Monitor",
    blurb: "Watching the market; could go either way.",
    Icon: Eye,
    stripe: "border-l-amber-500/80",
    iconMuted: "text-amber-600/85 dark:text-amber-400/90",
    dropActive: "ring-2 ring-amber-500/35 bg-amber-500/[0.04]",
  },
  {
    id: "sell",
    title: "Sell",
    blurb: "Time to list; capture today's price.",
    Icon: Tag,
    stripe: "border-l-rose-500/80",
    iconMuted: "text-rose-600/85 dark:text-rose-400/90",
    dropActive: "ring-2 ring-rose-500/35 bg-rose-500/[0.04]",
  },
];

export function PortfolioFolders({ items }: { items: FolderItem[] }) {
  const [folders, setFolders] = useState<FolderMap>(() => loadFolders());
  const [dragOver, setDragOver] = useState<FolderId | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    saveFolders(folders);
  }, [folders]);

  const grouped = useMemo(() => {
    const map: Record<FolderId, FolderItem[]> = {
      hold: [],
      monitor: [],
      sell: [],
      uncategorized: [],
    };
    for (const item of items) {
      const f = folders[item.id] ?? "uncategorized";
      map[f].push(item);
    }
    return map;
  }, [items, folders]);

  const handleDrop = (folderId: FolderId, estimateId: string) => {
    setFolders((prev) => {
      const next = { ...prev };
      if (folderId === "uncategorized") {
        delete next[estimateId];
      } else {
        next[estimateId] = folderId;
      }
      return next;
    });
    setDragOver(null);
  };

  const onDragStart = (e: React.DragEvent, estimateId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", estimateId);
  };

  const totalIn = (folderId: FolderId) => grouped[folderId].reduce((s, i) => s + i.liveValue, 0);

  return (
    <section className="rounded-2xl border border-border/50 bg-card/40">
      <div className="border-b border-border/40 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Smart folders</h2>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Drag tiles between folders. Pause on a tile for title, type, and value. Layout is saved on this device
                only.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {FOLDER_DEFS.map((def) => {
            const list = grouped[def.id];
            const isOver = dragOver === def.id;
            const sumLabel = list.length > 0 ? formatMoney(totalIn(def.id), list[0].currency) : null;

            return (
              <div
                key={def.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOver(def.id);
                }}
                onDragLeave={(e) => {
                  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                    setDragOver((cur) => (cur === def.id ? null : cur));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) handleDrop(def.id, id);
                }}
                data-testid={`folder-${def.id}`}
                className={cn(
                  "flex min-h-[168px] flex-col rounded-xl border border-border/50 bg-background/40",
                  "border-l-[3px] shadow-sm transition-colors",
                  def.stripe,
                  isOver && def.dropActive,
                )}
              >
                <header className="flex flex-col gap-1 px-4 pt-3.5 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <def.Icon className={cn("h-4 w-4 shrink-0", def.iconMuted)} aria-hidden />
                      <span className="truncate text-sm font-semibold">{def.title}</span>
                      <span className="shrink-0 rounded-md bg-muted/80 px-1.5 py-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {list.length}
                      </span>
                    </div>
                    {sumLabel ? (
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {sumLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground">{def.blurb}</p>
                </header>

                <div className="flex flex-1 flex-wrap content-start gap-2 px-4 pb-3.5 pt-1">
                  {list.length === 0 ? (
                    <div className="flex min-h-[88px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/55 bg-muted/25 px-3 py-6 text-center">
                      <span className="text-[11px] text-muted-foreground">Drop valuation tiles here</span>
                    </div>
                  ) : (
                    list.map((item) => (
                      <FolderIconChip
                        key={item.id}
                        item={item}
                        onDragStart={onDragStart}
                        onOpenEstimate={() => navigate(`/estimates/${item.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {grouped.uncategorized.length > 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver("uncategorized");
            }}
            onDragLeave={(e) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                setDragOver((cur) => (cur === "uncategorized" ? null : cur));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) handleDrop("uncategorized", id);
            }}
            data-testid="folder-uncategorized"
            className={cn(
              "rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 transition-colors",
              dragOver === "uncategorized" && "bg-muted/35 ring-2 ring-accent/25",
            )}
          >
            <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{grouped.uncategorized.length}</span> not in a folder yet.
              Drag into Hold, Monitor, or Sell.
            </p>
            <div className="flex flex-wrap gap-2">
              {grouped.uncategorized.map((item) => (
                <FolderIconChip
                  key={item.id}
                  item={item}
                  onDragStart={onDragStart}
                  onOpenEstimate={() => navigate(`/estimates/${item.id}`)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FolderIconChip({
  item,
  onDragStart,
  onOpenEstimate,
}: {
  item: FolderItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onOpenEstimate: () => void;
}) {
  const AssetIcon = iconForAssetType(item.assetTypeName);

  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, item.id)}
          onClick={onOpenEstimate}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenEstimate();
            }
          }}
          data-testid={`folder-chip-${item.id}`}
          aria-label={`${item.title}. Hover for details. Click to open or drag to a folder.`}
          className={cn(
            "flex h-11 w-11 shrink-0 cursor-grab select-none items-center justify-center rounded-xl",
            "border border-border/60 bg-background/95 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all",
            "active:cursor-grabbing hover:-translate-y-px hover:border-border hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <AssetIcon className="h-[1.2rem] w-[1.2rem] text-accent pointer-events-none" aria-hidden />
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="z-50 w-64 space-y-2.5 p-3">
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{item.title}</p>
        <p className="text-[11px] text-muted-foreground">{item.assetTypeName}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(item.liveValue, item.currency)}</p>
        <p className="border-t border-border/50 pt-2 text-[10px] leading-snug text-muted-foreground">
          Click to open the report. Drag to another folder.
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
