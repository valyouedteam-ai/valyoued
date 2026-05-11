import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import NewEstimatePage from "@/pages/estimates/new";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

export default function StartPage() {
  return (
    <div className="dark min-h-[100dvh] bg-[hsl(222,47%,7%)] text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute -bottom-60 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <header className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-sm ring-1 ring-accent/40">
            <img src={LOGO_URL} alt="ValYoued" className="h-6 w-6 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-brand font-semibold tracking-tight text-white">
              ValYoued
            </div>
          </div>
        </Link>
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Home
          </Button>
        </Link>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 pt-8 pb-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] font-medium text-accent uppercase tracking-wider">
            Step 1 of 2
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-sans font-semibold text-white tracking-tight">
          Tell us about what you're selling
        </h2>
        <p className="mt-2 text-base text-white/70 max-w-2xl leading-relaxed">
          Fill in the details below and we'll compute a global market valuation in
          seconds. You'll create a free account at the end to unlock your full report.
        </p>
      </div>

      <div className="relative z-10 px-4 md:px-6 pb-16 pt-6">
        <NewEstimatePage />
      </div>
    </div>
  );
}
