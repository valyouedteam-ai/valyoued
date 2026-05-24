import { Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PaidFeatureTeaser({
  title,
  description,
  eyebrow,
  href = "/settings",
}: {
  title: string;
  description: string;
  eyebrow?: string;
  href?: string;
}) {
  return (
    <Card className="relative overflow-hidden border border-border/70 bg-muted/10">
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center bg-background/65 backdrop-blur-md" aria-hidden />
      <CardHeader className="relative pb-3">
        {eyebrow ? <CardDescription>{eyebrow}</CardDescription> : null}
        <div className="flex items-start gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Lock className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-3">
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 px-3 py-6 text-center text-xs text-muted-foreground">
          Preview only on Everyday Free. Unlock with Everyday+ or Professional.
        </div>
        <Button className="w-full rounded-xl" asChild variant="secondary">
          <Link href={href}>View plans and upgrade path</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
