import { useState } from "react";
import type { ListingDraft } from "@workspace/api-client-react";
import { Copy, Check, Camera, Lightbulb, Hash, Tag, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM_LABEL, PLATFORM_URL } from "@/lib/platforms";

export function ListingDraftView({ draft }: { draft: ListingDraft }) {
  const [copied, setCopied] = useState<"title" | "body" | "all" | null>(null);
  const { toast } = useToast();

  const copy = async (text: string, what: "title" | "body" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy manually.", variant: "destructive" });
    }
  };

  const fullText = `${draft.draftTitle}\n\n${draft.draftBody}${
    draft.hashtags.length > 0 ? `\n\n${draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : ""
  }`;

  const platformLabel = PLATFORM_LABEL[draft.platform] || draft.platform;
  const platformUrl = PLATFORM_URL[draft.platform];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-ui-caps tracking-normal">
            {platformLabel}
          </Badge>
          <Badge variant="secondary" className="tabular-nums font-medium">
            <Tag className="h-3 w-3 mr-1" />
            {formatMoney(draft.suggestedPrice, draft.currency)}
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => copy(fullText, "all")} data-testid="copy-all-btn">
          {copied === "all" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          Copy entire ad
        </Button>
      </div>

      {platformUrl && (
        <a
          href={platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          data-testid="post-on-platform-btn"
        >
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">
                  Post this on {platformLabel}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Opens the listing form. Paste the title and description below.
                </div>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 text-ui-caps tracking-normal">
              Open
            </Badge>
          </div>
        </a>
      )}

      <Card className="bg-card/60">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-ui-caps text-muted-foreground tracking-normal">Title</CardTitle>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(draft.draftTitle, "title")}>
            {copied === "title" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-base font-medium leading-snug">{draft.draftTitle}</p>
        </CardContent>
      </Card>

      <Card className="bg-card/60">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-ui-caps text-muted-foreground tracking-normal">Description</CardTitle>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(draft.draftBody, "body")} data-testid="copy-body-btn">
            {copied === "body" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{draft.draftBody}</pre>
        </CardContent>
      </Card>

      {draft.hashtags.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-ui-caps text-muted-foreground tracking-normal flex items-center gap-1">
              <Hash className="h-3 w-3" /> Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {draft.hashtags.map((h) => (
                <Badge key={h} variant="outline" className="text-xs font-medium">
                  {h.startsWith("#") ? h : `#${h}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-ui-caps text-muted-foreground tracking-normal flex items-center gap-1">
            <Camera className="h-3 w-3" /> Photos to take ({draft.photoTips.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {draft.photoTips.map((tip, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 h-6 w-6 rounded-full bg-accent/15 text-accent text-xs tabular-nums font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium">{tip.angle}</span>
                  <span className="text-muted-foreground">: {tip.description}</span>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {draft.proTips.length > 0 && (
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-ui-caps text-muted-foreground tracking-normal flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Selling tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {draft.proTips.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent shrink-0">·</span>
                  <span className="text-foreground/90">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
