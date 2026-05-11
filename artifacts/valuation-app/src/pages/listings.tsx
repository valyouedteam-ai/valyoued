import { useState } from "react";
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

export default function ListingsPage() {
  const { data: drafts, isLoading } = useListListingDrafts();
  const queryClient = useQueryClient();
  const deleteDraft = useDeleteListingDraft();
  const { toast } = useToast();

  const [selected, setSelected] = useState<ListingDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ListingDraft | null>(null);

  const handleDelete = (draft: ListingDraft) => {
    deleteDraft.mutate(
      { id: draft.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListListingDraftsQueryKey() });
          toast({ title: "Draft deleted" });
          setConfirmDelete(null);
          if (selected?.id === draft.id) setSelected(null);
        },
        onError: () => {
          toast({ title: "Couldn't delete", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto pt-12">
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed rounded-xl bg-card/30">
          <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Megaphone className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-2xl font-sans mb-2">No ad drafts yet</h3>
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-ui-caps text-accent mb-2">
            <Megaphone className="h-3 w-3" /> Saved Ad Drafts
          </div>
          <h1 className="text-3xl font-sans font-bold text-foreground">Ad Drafts</h1>
          <p className="text-muted-foreground mt-1">
            {drafts.length} draft{drafts.length === 1 ? "" : "s"} ready to copy & paste into your chosen marketplace.
          </p>
        </div>
        <Link href="/portfolio">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create from portfolio
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drafts.map((draft) => (
          <Card
            key={draft.id}
            className="hover:border-accent/50 transition-all cursor-pointer group"
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
              <CardTitle className="font-sans text-base leading-tight pt-1.5 line-clamp-2 group-hover:text-accent transition-colors">
                {draft.draftTitle}
              </CardTitle>
              <CardDescription className="text-xs">
                {draft.assetTypeName} · {draft.assetTitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {draft.draftBody}
              </p>
              <div className="flex items-center gap-3 mt-3 text-ui-caps text-muted-foreground tracking-normal">
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
                <span className="ml-auto text-muted-foreground/70 normal-case tracking-normal font-sans">
                  {formatDistanceToNow(new Date(draft.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs justify-start text-foreground/80">
                  Open & copy
                  <ChevronRight className="h-3.5 w-3.5 ml-auto" />
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

      {/* View dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
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
