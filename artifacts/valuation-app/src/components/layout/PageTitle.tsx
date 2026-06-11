import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PAGE_TITLE_CLASS = "text-3xl font-sans font-bold text-foreground";

export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn(PAGE_TITLE_CLASS, className)}>{children}</h1>;
}
