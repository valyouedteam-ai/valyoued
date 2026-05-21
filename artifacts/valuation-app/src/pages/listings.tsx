import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  Plus,
  Trash2,
  ChevronRight,
  Camera,
  Hash,
  Lightbulb,
  Search,
} from "lucide-react";
import {
  useListListingDrafts,
  useDeleteListingDraft,
  getListListingDraftsQueryKey,
} from "@workspace/api-client-react";
import type { ListingDraft } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ListingDraftView } from "@/components/ListingDraftView";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM_LABEL } from "@/lib/platforms";

type SortKey = "newest" | "oldest" | "price_high" | "price_low" | "title_az";

export default function ListingsPage() {
  const { data: drafts, isLoading } = useListListingDrafts();
  const queryClient = useQueryClient();
  const deleteDraft = useDeleteListingDraft();
  const { toast } = useToast();

  const [selected, setSelected] = useState<ListingDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ListingDraft | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const platformsInUse = useMemo(() => {
    const rows = drafts ?? [];
    const set = new Set(rows.map((d) => d.platform));
    return [...set].sort((a, b) => {
      const la = PLATFORM_LABEL[a] ?? a;
      const lb = PLATFORM_LABEL[b] ?? b;
      return la.localeCompare(lb);
    });
  }, [drafts]);

  const filteredDrafts = useMemo(() => {
    const rows = drafts ?? [];
    let out = [...rows];

    if (platformFilter !== "all") {
      out = out.filter((d) => d.platform === platformFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((d) => {
        const label = PLATFORM_LABEL[d.platform]?.toLowerCase() ?? "";
        const blob = [
          d.draftTitle,
          d.assetTitle,
          d.assetTypeName,
          d.draftBody,
          d.platform,
          label,
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }

    const byTime = (a: ListingDraft, b: ListingDraft) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    switch (sortKey) {
      case "oldest":
        out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "price_high":
        out.sort((a, b) => b.suggestedPrice - a.suggestedPrice);
        break;
      case "price_low":
        out.sort((a, b) => a.suggestedPrice - b.suggestedPrice);
        break;
      case "title_az":
        out.sort((a, b) => a.draftTitle.localeCompare(b.draftTitle));
        break;
      case "newest":
      default:
        out.sort(byTime);
        break;
    }

    return out;
  }, [drafts, platformFilter, search, sortKey]);

  const handleDelete = (draft: ListingDraft) => {
    deleteDraft.mutate(
      { id: draft.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListListingDraftsQueryKey() });
          toast({ title: "Ad deleted" });
          setConfirmDelete(null);
          if (selected?.id === draft.id) setSelected(null);
        },
        onError: () => {
          toast({ title: "Couldn't delete", variant: "destructive" });
        },
      },
    );
  };

  const filtersActive = search.trim().length > 0 || platformFilter !== "all" || sortKey !== "newest";

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const allDrafts = drafts ?? [];

  if (allDrafts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-12">
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-xl bg-card/30">
          <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Megaphone className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-2xl font-sans mb-2">No ads yet</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Open any of your valuations and click <span className="font-medium text-foreground">"List for sale"</span> to generate
            a marketplace ad: title, description, photo angles and pricing strategy in one click.
          </p>
          <Link href="/portfolio">
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Go to my portfolio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const clearFilters = () => {
    setSearch("");
    setPlatformFilter("all");
    setSortKey("newest");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-ui-caps text-accent mb-2">
            <Megaphone className="h-3 w-3" /> Saved ads
          </div>
          <h1 className="text-3xl font-sans font-bold text-foreground">Ads</h1>
          {filteredDrafts.length !== allDrafts.length ? (
            <p className="text-muted-foreground mt-1">
              Showing {filteredDrafts.length} of {allDrafts.length} ad{allDrafts.length === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>
        <Link href="/portfolio">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create from portfolio
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
        <div className="flex flex-nowrap items-end gap-2 sm:gap-3 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          <div className="flex min-w-[8rem] flex-1 flex-col gap-1.5">
            <Label htmlFor="draft-search" className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="draft-search"
                placeholder="Title, marketplace, body…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
                data-testid="draft-search-input"
              />
            </div>
          </div>

          <div className="flex w-40 shrink-0 flex-col gap-1.5 sm:w-44">
            <Label className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">Marketplace</Label>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger aria-label="Filter by marketplace" className="h-9" data-testid="draft-filter-platform">
                <SelectValue placeholder="Marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All marketplaces</SelectItem>
                {platformsInUse.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {PLATFORM_LABEL[slug] ?? slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-40 shrink-0 flex-col gap-1.5 sm:w-44">
            <Label className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">Sort</Label>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger aria-label="Sort ads" className="h-9" data-testid="draft-sort-select">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="price_high">Price high to low</SelectItem>
                <SelectItem value="price_low">Price low to high</SelectItem>
                <SelectItem value="title_az">Title A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex shrink-0 flex-col gap-1.5">
            <div className="h-5 shrink-0" aria-hidden />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 whitespace-nowrap"
              disabled={!filtersActive}
              onClick={clearFilters}
              data-testid="draft-reset-filters"
            >
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      {filteredDrafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-14 text-center">
          <p className="font-medium text-foreground">No ads match your filters</p>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search phrase or marketplace.</p>
          <Button type="button" variant="outline" size="sm" className="mt-6" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrafts.map((draft) => (
            <Card
              key={draft.id}
              className="group cursor-pointer transition-all hover:border-accent/50"
              onClick={() => setSelected(draft)}
              data-testid="draft-card"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-ui-caps tracking-normal">
                    {PLATFORM_LABEL[draft.platform] || draft.platform}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums text-accent">
                    {formatMoney(draft.suggestedPrice, draft.currency)}
                  </span>
                </div>
                <CardTitle className="line-clamp-2 pt-1.5 font-sans text-base leading-tight transition-colors group-hover:text-accent">
                  {draft.draftTitle}
                </CardTitle>
                <CardDescription className="text-xs">
                  {draft.assetTypeName} · {draft.assetTitle}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{draft.draftBody}</p>
                <div className="mt-3 flex items-center gap-3 text-ui-caps tracking-normal text-muted-foreground">
                  {draft.photoTips.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3 w-3" /> {draft.photoTips.length}
                    </span>
                  )}
                  {draft.hashtags.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {draft.hashtags.length}
                    </span>
                  )}
                  {draft.proTips.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" /> {draft.proTips.length}
                    </span>
                  )}
                  <span className="ml-auto font-sans normal-case tracking-normal text-muted-foreground/70">
                    {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
                  <Button size="sm" variant="ghost" className="h-8 flex-1 justify-start text-xs text-foreground/80">
                    Open & copy
                    <ChevronRight className="ml-auto h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(draft);
                    }}
                    data-testid="draft-delete-btn"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-sans">
                  <Megaphone className="h-5 w-5 text-accent" />
                  {selected.assetTitle}
                </DialogTitle>
                <DialogDescription>
                  {PLATFORM_LABEL[selected.platform] || selected.platform} · {selected.assetTypeName}
                </DialogDescription>
              </DialogHeader>
              <ListingDraftView draft={selected} />
              <DialogFooter className="pt-2">
                <Link href={`/estimates/${selected.estimateId}`}>
                  <Button variant="outline">Open valuation</Button>
                </Link>
                <Button onClick={() => setSelected(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ad?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved listing for "{confirmDelete?.assetTitle}". You can always regenerate it from the valuation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
