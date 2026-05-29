import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type UseCaseId = "resell" | "collect" | "inherit" | "pro";

function MockShell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-xl sm:p-8", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: string; tone?: "default" | "good" | "warn" | "violet" }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        tone === "good" && "border-emerald-500/20 bg-emerald-500/10",
        tone === "warn" && "border-amber-500/25 bg-amber-500/10",
        tone === "violet" && "border-violet-500/25 bg-violet-500/10",
        !tone || tone === "default" ? "border-black/5 bg-muted/40" : "",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ResellerPreview() {
  return (
    <MockShell label="Trading desk">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Hermès Birkin 30 · Etoupe</p>
            <p className="text-xs text-muted-foreground">In stock · 14 days held</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Deal score</p>
            <p className="text-lg font-bold tabular-nums text-emerald-600">82</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Buy at" value="£11,400" />
          <StatPill label="List at" value="£14,200" tone="good" />
          <StatPill label="Margin" value="+18%" tone="good" />
        </div>

        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-xs font-semibold text-amber-900">Repricing alert</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-950/80">
            UK demand softened. Consider £13,800 or move to Vestiaire EU.
          </p>
        </div>
      </div>
    </MockShell>
  );
}

function CollectorPreview() {
  return (
    <MockShell label="Portfolio">
      <div className="space-y-3">
        <div className="rounded-2xl border border-black/5 bg-[hsl(175,45%,94%)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Portfolio health</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatPill label="Total value" value="£148,200" />
            <StatPill label="Resale strength" value="74/100" tone="good" />
            <StatPill label="Diversification" value="61/100" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {["Luxury shelf", "Everyday", "Collectibles"].map((shelf) => (
            <span
              key={shelf}
              className="rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-semibold text-foreground/80"
            >
              {shelf}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-black/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Rolex Datejust 41</p>
              <p className="text-xs text-muted-foreground">Receipt on file · Strong comps</p>
            </div>
            <p className="text-sm font-semibold tabular-nums text-foreground">£9,800</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[78%] rounded-full bg-accent" />
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">Confidence 78%</p>
        </div>
      </div>
    </MockShell>
  );
}

function InheritancePreview() {
  return (
    <MockShell label="Inheritance" className="ring-1 ring-violet-500/15">
      <div className="space-y-3">
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Separate ledger</p>
          <p className="mt-1 text-sm leading-relaxed text-violet-950/80">
            Heirloom holdings stay off your primary portfolio totals.
          </p>
        </div>

        <div className="space-y-2">
          {[
            { title: "Grandfather's Omega Seamaster", value: "£3,400", note: "Box, no papers" },
            { title: "Estate pearl necklace", value: "£2,100", note: "Appraisal pending" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-violet-500/15 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <StatPill label="Heirloom shelf total" value="£5,500" tone="violet" />
      </div>
    </MockShell>
  );
}

function ProfessionalPreview() {
  return (
    <MockShell label="Market watch">
      <div className="space-y-3">
        <div className="rounded-2xl border border-black/5 bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Chanel Classic Flap · medium</p>
              <p className="text-xs text-muted-foreground">Luxury bags · UK + EU comps</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Demand +12%
            </span>
          </div>
          <div className="mt-4 flex h-16 items-end gap-1.5">
            {[38, 52, 44, 61, 58, 72, 68].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-accent/70"
                style={{ height: `${h}%` }}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatPill label="Median sold" value="£4,650" />
          <StatPill label="Buy below" value="£4,200" tone="good" />
        </div>

        <div className="rounded-2xl border border-black/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pipeline</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Sourced", "Listed", "Sold"].map((stage, i) => (
              <span
                key={stage}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                  i === 0 ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground",
                )}
              >
                {stage}
              </span>
            ))}
          </div>
        </div>
      </div>
    </MockShell>
  );
}

const PREVIEWS: Record<UseCaseId, () => ReactNode> = {
  resell: ResellerPreview,
  collect: CollectorPreview,
  inherit: InheritancePreview,
  pro: ProfessionalPreview,
};

export function UseCaseFeaturePreview({ variant }: { variant: UseCaseId }) {
  const Preview = PREVIEWS[variant];
  return <Preview />;
}
