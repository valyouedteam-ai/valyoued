import { MarketingTopNav } from "@/components/layout/MarketingTopNav";
import NewEstimatePage from "@/pages/estimates/new";

export default function StartPage() {
  return (
    <div className="mesh-bg relative min-h-[100dvh] overflow-hidden text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-accent/8 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-[hsl(199_70%_50%/0.06)] blur-[100px]" />
      </div>

      <MarketingTopNav variant="light" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-6 md:px-6">
        <NewEstimatePage />
      </div>
    </div>
  );
}
