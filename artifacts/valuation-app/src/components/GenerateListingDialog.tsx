import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerateListingDraft,
  getListListingDraftsQueryKey,
} from "@workspace/api-client-react";
import type { ListingDraft } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone, Loader2, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ListingDraftView } from "./ListingDraftView";

export const PLATFORMS = [
  { id: "facebook-marketplace", name: "Facebook Marketplace" },
  { id: "ebay", name: "eBay" },
  { id: "gumtree", name: "Gumtree" },
  { id: "craigslist", name: "Craigslist" },
  { id: "depop", name: "Depop" },
  { id: "vinted", name: "Vinted" },
  { id: "vestiaire-collective", name: "Vestiaire Collective" },
  { id: "autotrader", name: "AutoTrader" },
  { id: "chrono24", name: "Chrono24" },
  { id: "rightmove", name: "Rightmove" },
] as const;

const STRATEGIES = [
  { id: "quick-sale", name: "Quick sale (~10% under market)" },
  { id: "market", name: "Fair market price" },
  { id: "premium", name: "Premium (~8% above market)" },
] as const;

interface Props {
  estimateId: string;
  estimateTitle: string;
  assetTypeName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GenerateListingDialog({
  estimateId,
  estimateTitle,
  assetTypeName,
  open: openProp,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [platform, setPlatform] = useState<string>(suggestPlatform(assetTypeName));
  const [strategy, setStrategy] = useState<string>("market");
  const [draft, setDraft] = useState<ListingDraft | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generate = useGenerateListingDraft();

  const handleGenerate = () => {
    generate.mutate(
      {
        data: {
          estimateId,
          platform: platform as any,
          priceStrategy: strategy as any,
        },
      },
      {
        onSuccess: (result) => {
          setDraft(result);
          queryClient.invalidateQueries({ queryKey: getListListingDraftsQueryKey() });
          toast({
            title: "Listing draft ready",
            description: "Copy & paste it straight into the platform.",
          });
        },
        onError: (err: any) => {
          toast({
            title: "Couldn't generate the listing",
            description: err?.message || "Try again in a moment.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDraft(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-sans">
            <Megaphone className="h-5 w-5 text-accent" />
            Generate listing ad
          </DialogTitle>
          <DialogDescription>
            For <span className="font-medium text-foreground">{estimateTitle}</span> · {assetTypeName}
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Marketplace</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger data-testid="listing-platform-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Each platform has its own tone, length and audience; we match it.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pricing strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger data-testid="listing-strategy-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={handleGenerate}
                disabled={generate.isPending}
                data-testid="listing-generate-btn"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Writing your ad...
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4 mr-2" />
                    Generate listing
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <ListingDraftView draft={draft} />
            <DialogFooter className="pt-2 flex flex-row sm:justify-between sm:space-x-0 gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>
                Generate another
              </Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function suggestPlatform(assetTypeName: string): string {
  const n = assetTypeName.toLowerCase();
  if (n.includes("watch")) return "chrono24";
  if (n.includes("car") || n.includes("vehicle") || n.includes("motor")) return "autotrader";
  if (n.includes("real estate") || n.includes("property") || n.includes("house") || n.includes("flat") || n.includes("apartment")) return "rightmove";
  if (n.includes("handbag") || n.includes("designer")) return "vestiaire-collective";
  if (n.includes("clothing") || n.includes("sneaker") || n.includes("fashion")) return "depop";
  return "facebook-marketplace";
}
