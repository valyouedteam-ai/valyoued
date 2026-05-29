import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

export type MarketingTopNavVariant = "light" | "dark";

/**
 * Persistent marketing chrome (logged-out funnel). Matches landing affordances across /, /pricing, /welcome,
 * Clerk pages, Privacy, Start, etc.
 */
export function MarketingTopNav({ variant }: { variant: MarketingTopNavVariant }) {
  const isDark = variant === "dark";

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full border-b backdrop-blur-md",
        isDark
          ? "border-white/10 bg-[hsl(222,47%,8%)]/90 text-white"
          : "border-border/50 bg-[hsl(40,25%,96%)]/92 text-foreground dark:bg-background/92",
      )}
      aria-label="Site"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1",
            isDark ? "bg-white/95 ring-accent/40" : "bg-card ring-border/80",
          )}
        >
          <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
        </div>
        <span className={cn("font-brand text-2xl", isDark ? "text-white" : "text-foreground")}>ValYoued</span>
      </Link>

      <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
        <Link href="/pricing#plans">
          <Button
            variant="ghost"
            className={
              isDark
                ? "text-white/80 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Pricing
          </Button>
        </Link>
        <Link href="/sign-in">
          <Button
            variant="ghost"
            className={cn(
              "hidden sm:inline-flex",
              isDark
                ? "text-white/80 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
            data-testid="nav-sign-in"
          >
            Sign in
          </Button>
        </Link>
        <Link href="/sign-up">
          <Button
            className={cn(
              "rounded-full px-6 font-semibold shadow-md shadow-black/10",
              isDark && "bg-accent text-accent-foreground hover:bg-accent/90",
            )}
            data-testid="nav-sign-up"
          >
            Sign up free
          </Button>
        </Link>
        <Link href="/start">
          <Button
            variant="secondary"
            className={
              isDark
                ? "rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 gap-2"
                : "rounded-full border border-border/60 shadow-sm gap-2"
            }
            data-testid="nav-get-started"
          >
            Start free valuation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      </div>
    </nav>
  );
}
