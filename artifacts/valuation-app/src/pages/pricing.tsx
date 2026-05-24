import { Link } from "wouter";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";
import { MarketingPlanCards } from "@/components/marketing/MarketingPlanCards";

export default function PricingPage() {
  return (
    <div className="min-h-[100dvh] bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.08),transparent_70%)] blur-3xl" />
      </div>

      <MarketingTopNav variant="light" />

      <MarketingPlanCards layout="page" />

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/70 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <span>© {new Date().getFullYear()} ValYoued</span>
        <div className="flex gap-8">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/welcome" className="transition-colors hover:text-foreground">
            Tailor signup
          </Link>
        </div>
      </footer>
    </div>
  );
}
