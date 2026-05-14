import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewEstimatePage from "@/pages/estimates/new";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

export default function StartPage() {
  return (
    <div className="mesh-bg relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-accent/8 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-[hsl(199_70%_50%/0.06)] blur-[100px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 pb-2 pt-6 md:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border/80">
            <img src={LOGO_URL} alt="ValYoued" className="h-6 w-6 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-brand text-lg tracking-tight text-foreground">ValYoued</div>
          </div>
        </Link>
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Home
          </Button>
        </Link>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-2 pt-6 md:px-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span className="text-ui-caps text-accent">Step 1 of 2</span>
        </div>
        <h2 className="font-sans text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Tell us about what you&apos;re selling
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Fill in the details below and we&apos;ll compute a market valuation in seconds. You&apos;ll create a
          free account at the end to unlock your full report.
        </p>
      </div>

      <div className="relative z-10 px-4 pb-16 pt-6 md:px-6">
        <NewEstimatePage />
      </div>
    </div>
  );
}
