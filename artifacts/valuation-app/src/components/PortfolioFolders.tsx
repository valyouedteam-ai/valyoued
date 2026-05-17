import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, Eye, Tag, Inbox, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  id: FolderId;
  title: string;
  blurb: string;
  Icon: typeof TrendingUp;
  tone: string;
  ring: string;
}> = [
  {
    id: "hold",
    title: "Hold",
    blurb: "Long-term keepers; let them appreciate.",
    Icon: TrendingUp,
    tone: "from-emerald-500/15 to-emerald-500/0 border-emerald-500/30",
    ring: "ring-emerald-400/60",
  },
  {
    id: "monitor",
    title: "Monitor",
    blurb: "Watching the market; could go either way.",
    Icon: Eye,
    tone: "from-amber-500/15 to-amber-500/0 border-amber-500/30",
    ring: "ring-amber-400/60",
  },
  {
    id: "sell",
    title: "Sell",
    blurb: "Time to list; capture today's price.",
    Icon: Tag,
    tone: "from-rose-500/15 to-rose-500/0 border-rose-500/30",
    ring: "ring-rose-400/60",
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

  const totalIn = (folderId: FolderId) =>
    grouped[folderId].reduce((s, i) => s + i.liveValue, 0);

  return (
    <Card className="bg-card/40 border-border/40">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="font-sans text-lg flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-accent" />
              Smart folders
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Drag assets between folders to plan your next move. We remember your sorting on this device.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {FOLDER_DEFS.map((def) => {
            const list = grouped[def.id];
            const isOver = dragOver === def.id;
            return (
              <div
                key={def.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOver(def.id);
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the drop zone (not entering a child)
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
                  "rounded-xl border bg-gradient-to-br transition-all min-h-[180px] p-3 flex flex-col",
                  def.tone,
                  isOver && `ring-2 ${def.ring} scale-[1.01]`,
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <def.Icon className="h-4 w-4" />
                    <span className="font-semibold text-sm">{def.title}</span>
                    <Badge variant="secondary" className="font-sans text-[10px]">
                      {list.length}
                    </Badge>
                  </div>
                  {list.length > 0 && (
                    <span className="text-[10px] font-sans text-muted-foreground">
                      ≈ {formatMoney(totalIn(def.id), list[0].currency)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">{def.blurb}</p>

                <div className="flex flex-col gap-1.5 flex-1">
                  {list.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center rounded-md border border-dashed border-border/50 text-[11px] text-muted-foreground italic">
                      Drop assets here
                    </div>
                  ) : (
                    list.map((item) => (
                      <FolderChip
                        key={item.id}
                        item={item}
                        onDragStart={onDragStart}
                        onClick={() => navigate(`/estimates/${item.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Uncategorized tray */}
        {grouped.uncategorized.length > 0 && (
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
              "rounded-lg border border-dashed border-border bg-background/40 p-3 transition-all",
              dragOver === "uncategorized" && "ring-2 ring-accent/40",
            )}
          >
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" />
              Unsorted ({grouped.uncategorized.length}): drag into a folder above
            </div>
            <div className="flex flex-wrap gap-1.5">
              {grouped.uncategorized.map((item) => (
                <FolderChip
                  key={item.id}
                  item={item}
                  onDragStart={onDragStart}
                  onClick={() => navigate(`/estimates/${item.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FolderChip({
  item,
  onDragStart,
  onClick,
}: {
  item: FolderItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
}) {
  const Icon = iconForAssetType(item.assetTypeName);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      data-testid={`folder-chip-${item.id}`}
      className="group cursor-grab active:cursor-grabbing flex items-center gap-2 rounded-md border border-border/60 bg-background/80 hover:bg-background hover:border-accent/40 px-2 py-1.5 text-xs transition-all"
      title={`${item.title}. Drag to a folder or click to open`}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      <Icon className="h-3.5 w-3.5 text-accent shrink-0" />
      <span className="truncate max-w-[140px] font-medium">{item.title}</span>
      <span className="font-sans text-[10px] text-muted-foreground shrink-0">
        {formatMoney(item.liveValue, item.currency)}
      </span>
    </div>
  );
}
