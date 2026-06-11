import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LockedProOverlay } from "@/components/home/LockedProFeature";

export function PaidFeatureTeaser({
  title,
  description,
  eyebrow,
  href = "/pricing#plans",
}: {
  title: string;
  description: string;
  eyebrow?: string;
  href?: string;
}) {
  return (
    <Card className="relative overflow-hidden border border-border/70 bg-muted/10">
      <div className="pointer-events-none select-none blur-[2px] opacity-60" aria-hidden>
        <CardHeader className="pb-3">
          {eyebrow ? <CardDescription>{eyebrow}</CardDescription> : null}
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/80 bg-card/40 px-3 py-8 text-center text-xs text-muted-foreground">
            Regional payout grid · Markets cockpit · Monitor alerts
          </div>
        </CardContent>
      </div>
      <LockedProOverlay
        title={title}
        description={description}
        href={href}
        cta="View plans and upgrade"
      />
    </Card>
  );
}
