import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { useProTier } from "@/hooks/use-pro-tier";

/** Free-tier Pro UI preview (dev, auth stub, or `VITE_SHOW_PRO_PREVIEW_TOGGLE`). Paid users are always Pro. */
export function ProPreviewToggle({
  compact,
  label = "Pro",
}: {
  compact?: boolean;
  /** Visible label next to the switch. */
  label?: string;
}) {
  const authStub = useAuthStubContext();
  const showToggle =
    import.meta.env.DEV ||
    Boolean(authStub) ||
    import.meta.env.VITE_SHOW_PRO_PREVIEW_TOGGLE === "true";
  const { data } = useBillingSummary();
  const paid = Boolean(data?.hasPaidValuationTier);
  const { devProPreview, setDevProPreview } = useProTier();
  const switchId = useId();

  if (!showToggle) return null;

  const checked = paid || devProPreview;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-2 py-1 shadow-sm",
        compact ? "px-2" : "sm:gap-2 sm:px-2.5",
      )}
      title={
        paid
          ? "Your subscription already includes Pro features."
          : "Toggle Professional-tier UI locally for testing (saved in this browser only)."
      }
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
        checked={checked}
        disabled={paid}
        onCheckedChange={(on) => {
          if (!paid) setDevProPreview(on);
        }}
      />
    </div>
  );
}
