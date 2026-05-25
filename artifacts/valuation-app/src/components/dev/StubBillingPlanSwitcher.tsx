import { useContext } from "react";
import { StubBillingPlanDevContext } from "@/context/StubBillingPlanDevContext";
import type { StubBillingPlanSlug } from "@/context/StubBillingPlanDevContext";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const OPTIONS: { value: StubBillingPlanSlug; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "everyday_plus", label: "Everyday+" },
  { value: "professional", label: "Pro" },
];

/**
 * Visible in dev when `VITE_AUTH_STUB_MODE` is on.
 * Sends `X-Stub-Billing-Plan` on every API call so entitlement checks match the mocked workspace.
 */
export function StubBillingPlanSwitcher({ compact }: { compact?: boolean }) {
  const ctx = useContext(StubBillingPlanDevContext);
  if (!ctx) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border/70 bg-card/85 px-1.5 py-1 shadow-sm",
        compact && "justify-center px-2",
      )}
      title='Dev toggle: rotates stub billing tiers sent as X-Stub-Billing-Plan (AUTH_STUB_MODE on the API).'
    >
      <span
        className={cn(
          "hidden whitespace-nowrap pl-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground min-[980px]:inline",
          compact && "hidden",
        )}
      >
        Stub plan
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        className={cn("rounded-full border-none bg-transparent p-0", compact && "justify-center gap-0")}
        value={ctx.planSlug}
        onValueChange={(next) => {
          if (next !== "" && OPTIONS.some((o) => o.value === next)) ctx.setPlanSlug(next as StubBillingPlanSlug);
        }}
      >
        {OPTIONS.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} aria-label={o.label} className={cn(compact ? "px-2.5 py-1 text-[10px]" : "text-xs")}>
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
