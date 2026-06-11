import { Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ProBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border border-accent/30 bg-accent/10 px-2 py-0 text-[10px] font-semibold uppercase tracking-wide text-accent",
        className,
      )}
    >
      Pro
    </Badge>
  );
}

export function LockedProOverlay({
  title,
  description,
  href = "/pricing#plans",
  cta = "Upgrade to Everyday",
  className,
}: {
  title?: string;
  description?: string;
  href?: string;
  cta?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/75 px-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-accent" aria-hidden />
        <ProBadge />
      </div>
      {title ? <p className="text-center text-sm font-semibold text-foreground">{title}</p> : null}
      {description ? <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      <Button size="sm" variant="secondary" className="rounded-full" asChild>
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
