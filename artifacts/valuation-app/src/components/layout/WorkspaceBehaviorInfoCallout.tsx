import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WORKSPACE_BEHAVIOR_INFO_STORAGE_KEY = "valyoued.workspaceBehaviorInfoDismissed";

export function isWorkspaceBehaviorInfoDismissed(): boolean {
  try {
    return localStorage.getItem(WORKSPACE_BEHAVIOR_INFO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissWorkspaceBehaviorInfo(): void {
  try {
    localStorage.setItem(WORKSPACE_BEHAVIOR_INFO_STORAGE_KEY, "1");
  } catch {
    /* localStorage may be unavailable */
  }
}

/**
 * First-time workspace explainer. Dismissal is persisted in localStorage so it stays hidden after the user closes it.
 */
export function WorkspaceBehaviorInfoCallout({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isWorkspaceBehaviorInfoDismissed());
  }, []);

  function dismiss() {
    dismissWorkspaceBehaviorInfo();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Card
      className={cn(
        "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-transparent",
        className,
      )}
      role="region"
      aria-labelledby="workspace-behavior-info-title"
    >
      <CardHeader className="relative space-y-1.5 pb-4 pr-12">
        <CardTitle id="workspace-behavior-info-title" className="text-lg">
          How it behaves in ValYoued
        </CardTitle>
        <CardDescription>
          You switch workspaces from the pills under the top navigation bar. Inheritance-focused screens use violet hints
          so it is obvious which ledger you are in.
        </CardDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          onClick={dismiss}
          aria-label="Dismiss workspace info"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-inside list-disc space-y-2 pl-0.5 text-sm text-muted-foreground marker:text-violet-600">
          <li>Your primary dashboard and portfolio listings show only valuations attached to each workspace.</li>
          <li>
            When you run a valuation, pick <span className="font-medium text-foreground">portfolio workspace</span> on the
            Region step so the asset lands on the ledger you intend.
          </li>
          <li>The inheritance workspace is billed as an optional add-on in Settings when you need it permanently.</li>
        </ul>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={dismiss}>
          Got it
        </Button>
      </CardContent>
    </Card>
  );
}
