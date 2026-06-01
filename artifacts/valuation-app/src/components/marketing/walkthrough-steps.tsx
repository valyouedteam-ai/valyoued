import type { ReactNode } from "react";
import { Camera, Globe2, Megaphone, TrendingUp } from "lucide-react";

export const WALKTHROUGH_SCREEN_HEIGHT_PX = 360;

const mockScreenClass =
  "flex h-[360px] min-h-0 flex-col overflow-hidden bg-[hsl(222,26%,12%)] px-4 pb-4 pt-5 text-white";

export type WalkthroughStep = {
  id: string;
  title: string;
  body: string;
  icon: typeof Camera;
  screen: ReactNode;
};

function MockCaptureScreen() {
  return (
    <div className={mockScreenClass}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Valuate</p>
      <p className="mt-1 text-sm font-semibold">Add your asset</p>
      <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-6">
        <Camera className="h-8 w-8 text-accent" aria-hidden />
        <p className="mt-3 text-center text-xs text-white/70">Snap or upload a photo</p>
        <p className="mt-1 text-center text-[10px] text-white/45">Brand, model, condition hints</p>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-8 rounded-lg bg-white/10" />
        <div className="h-8 w-2/3 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

function MockValuationScreen() {
  return (
    <div className={mockScreenClass}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Report</p>
      <p className="mt-1 text-sm font-semibold">Hermès Birkin 30</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] uppercase tracking-wider text-white/45">Adjusted mid</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-accent">£14,200</p>
        <p className="mt-1 text-xs text-white/55">Baseline £12,800 – £15,600</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["Strong comps", "Box & papers", "Étoupe Togo"].map((chip) => (
          <span key={chip} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-white/50">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
        Condition uplift +8%
      </div>
    </div>
  );
}

function MockRegionsScreen() {
  return (
    <div className={mockScreenClass}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Markets</p>
      <p className="mt-1 text-sm font-semibold">Compare regions</p>
      <div className="mt-4 space-y-2">
        {[
          { region: "UK", pct: 72, net: "£13,400" },
          { region: "US", pct: 58, net: "$16,800" },
          { region: "EU", pct: 41, net: "€15,100" },
        ].map((row) => (
          <div key={row.region} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{row.region}</span>
              <span className="tabular-nums text-white/70">{row.net}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent/80" style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-white/50">
        <Globe2 className="h-3.5 w-3.5 text-accent" aria-hidden />
        Arbitrage rows on Everyday
      </div>
    </div>
  );
}

function MockListingScreen() {
  return (
    <div className={mockScreenClass}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">Ads</p>
      <p className="mt-1 text-sm font-semibold">Listing draft</p>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-medium leading-relaxed text-white/85">
          Authentic Hermès Birkin 30 in Étoupe Togo leather. Light wear on the corners. Full set with box and receipt.
        </p>
        <p className="mt-3 text-[10px] leading-relaxed text-white/50">
          Vestiaire · eBay UK · Depop suggested
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-xl bg-accent py-2 text-center text-xs font-semibold text-accent-foreground">
          Copy draft
        </div>
        <div className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70">Edit</div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
        <Megaphone className="h-3.5 w-3.5 text-accent" aria-hidden />
        Human tone, marketplace-ready
      </div>
    </div>
  );
}

export const PRODUCT_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "capture",
    title: "Capture once",
    body: "Photograph or describe the item. ValYoued reads brand, model, and condition cues where it can.",
    icon: Camera,
    screen: <MockCaptureScreen />,
  },
  {
    id: "valuation",
    title: "Get a market-backed range",
    body: "See baseline bands and an adjusted mid grounded in comparable sales and live listings.",
    icon: TrendingUp,
    screen: <MockValuationScreen />,
  },
  {
    id: "regions",
    title: "Compare regions",
    body: "Spot where demand and net proceeds differ before you pick a marketplace or ship internationally.",
    icon: Globe2,
    screen: <MockRegionsScreen />,
  },
  {
    id: "listing",
    title: "Move toward a listing",
    body: "Draft humane ad copy and jump toward the venues where that asset type tends to sell.",
    icon: Megaphone,
    screen: <MockListingScreen />,
  },
];
