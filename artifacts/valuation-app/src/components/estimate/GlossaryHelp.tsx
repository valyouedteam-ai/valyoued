import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GlossaryEntry } from "@/lib/estimate-glossary";

export function GlossaryHelp({ entry, label }: { entry: GlossaryEntry; label: string }) {
  const Icon = entry.icon;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={`What does ${label} mean?`}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" align="start">
        <div className="flex items-start gap-2">
          {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
          <p className="font-semibold text-foreground">{entry.title}</p>
        </div>
        <p className="mt-2 leading-relaxed text-muted-foreground">{entry.body}</p>
        {entry.imageSrc ? (
          <img src={entry.imageSrc} alt="" className="mt-3 w-full rounded-md border border-border/60" />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
