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
        "flex flex-wrap items-center gap-1.5 rounded-full border border-border/70 bg-card/85 px-1.5 py-0.5 shadow-sm",
        compact && "justify-center",
      )}
      title="Subscription simulation and inheritance. Auth stub: API reads X-Stub-Billing-Plan and X-Stub-Inheritance-Addon. Clerk dev: billing fields are mocked client-side; portfolio list is still real."
    >
      <span
        className={cn(
          "hidden whitespace-nowrap min-[980px]:inline font-mono text-[10px] font-medium tabular-nums tracking-tight text-muted-foreground",
          compact && "hidden",
        )}
      >
        Subscription
      </span>
      <Select
        value={ctx.planSlug}
        onValueChange={(next) => {
          if (OPTIONS.some((o) => o.value === next)) ctx.setPlanSlug(next as StubBillingPlanSlug);
        }}
      >
        <SelectTrigger
          className={cn(
            "relative flex h-7 min-h-7 w-fit min-w-[5.25rem] shrink-0 justify-center rounded-full border-border/60 px-6 py-0 text-xs font-medium shadow-none",
            "[&>span]:w-full [&>span]:truncate [&>span]:pr-4 [&>span]:text-center [&>span]:leading-none",
            "[&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:right-1.5 [&>svg]:top-1/2 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:-translate-y-1/2 [&>svg]:shrink-0 [&>svg]:opacity-60",
            compact && "h-6 min-h-6 min-w-[4.875rem] px-5 text-[11px] [&>span]:pr-3.5 [&>svg]:right-1 [&>svg]:h-3 [&>svg]:w-3",
          )}
          aria-label="Subscription tier"
        >
          <SelectValue placeholder="Plan" />
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="min-w-[var(--radix-select-trigger-width)]">
          {OPTIONS.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="justify-center pr-9 text-center text-xs data-[highlighted]:text-center focus:text-center focus:justify-center"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div
        className={cn(
          "flex items-center gap-1 border-border/60 min-[980px]:border-l min-[980px]:pl-1.5",
          compact && "min-[980px]:pl-1",
        )}
      >
        <Label
          htmlFor={inheritanceFieldId}
          className="cursor-pointer whitespace-nowrap font-mono text-[10px] text-muted-foreground"
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
