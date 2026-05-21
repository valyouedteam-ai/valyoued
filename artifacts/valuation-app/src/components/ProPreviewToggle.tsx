import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useProTier } from "@/hooks/use-pro-tier";

/** Local-only styling hint for development builds. Production hides this toggle; entitlement comes from Stripe and persisted estimate tier on the API. */
export function ProPreviewToggle({
  compact,
  label = "Pro tier",
}: {
  compact?: boolean;
  /** Visible label next to the switch. */
  label?: string;
}) {
  const { devProPreview, setDevProPreview } = useProTier();
  const switchId = useId();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-2 py-1 shadow-sm",
        compact ? "px-2" : "sm:gap-2 sm:px-2.5",
      )}
      title="Dev-only: persists a harmless UI chrome preference in this browser. It never unlocks paid valuation outputs or API limits."
    >
      <Label
        htmlFor={switchId}
        className={cn(
          "cursor-pointer whitespace-nowrap text-[11px] font-medium text-muted-foreground",
          !compact && "sm:text-xs",
        )}
      >
        {label}
      </Label>
      <Switch
        id={switchId}
        className="scale-90 data-[state=checked]:bg-accent"
        checked={devProPreview}
        onCheckedChange={setDevProPreview}
      />
    </div>
  );
}
