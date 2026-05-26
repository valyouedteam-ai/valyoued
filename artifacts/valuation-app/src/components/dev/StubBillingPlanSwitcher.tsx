import { useContext, useId } from "react";
import { StubBillingPlanDevContext } from "@/context/StubBillingPlanDevContext";
import type { StubBillingPlanSlug } from "@/context/StubBillingPlanDevContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const OPTIONS: { value: StubBillingPlanSlug; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "everyday_plus", label: "Everyday+" },
  { value: "professional", label: "Pro" },
];

/**
 * Shown whenever `StubBillingPlanDevProvider` mounts (development builds).
 * Auth stub: sends `X-Stub-Billing-Plan` and `X-Stub-Inheritance-Addon` so entitlements and portfolios stay in sync.
 * Clerk dev: billing snapshot is mocked in the browser; use auth stub to exercise the inheritance workspace end to end.
 */
export function StubBillingPlanSwitcher({ compact }: { compact?: boolean }) {
  const ctx = useContext(StubBillingPlanDevContext);
  const inheritanceFieldId = useId();
  if (!ctx) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-card/85 px-2 py-1 shadow-sm",
        compact && "justify-center",
      )}
      title="Dev tier and inheritance. Auth stub: API reads X-Stub-Billing-Plan and X-Stub-Inheritance-Addon. Clerk dev: billing fields are mocked client-side; portfolio list is still real."
    >
      <span
        className={cn(
          "hidden whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-muted-foreground min-[980px]:inline",
          compact && "hidden",
        )}
      >
        Dev tier
      </span>
      <Select
        value={ctx.planSlug}
        onValueChange={(next) => {
          if (OPTIONS.some((o) => o.value === next)) ctx.setPlanSlug(next as StubBillingPlanSlug);
        }}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-[7.25rem] shrink-0 rounded-full border-border/60 px-2.5 py-1.5 text-xs font-medium",
            compact && "h-7 w-[6.25rem] px-2 py-1 text-[10px]",
          )}
          aria-label="Dev billing tier"
        >
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="min-w-[var(--radix-select-trigger-width)]">
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div
        className={cn(
          "flex items-center gap-1.5 border-border/60 min-[980px]:border-l min-[980px]:pl-2",
          compact && "min-[980px]:pl-1.5",
        )}
      >
        <Label
          htmlFor={inheritanceFieldId}
          className={cn(
            "cursor-pointer whitespace-nowrap text-muted-foreground",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          {compact ? "Inh." : "Inheritance"}
        </Label>
        <Switch
          id={inheritanceFieldId}
          className="scale-90 data-[state=checked]:bg-accent"
          checked={ctx.inheritanceAddon}
          onCheckedChange={ctx.setInheritanceAddon}
          aria-label="Toggle inheritance add-on (dev)"
        />
      </div>
    </div>
  );
}
