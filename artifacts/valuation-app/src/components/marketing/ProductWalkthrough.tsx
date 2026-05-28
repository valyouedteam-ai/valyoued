import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PhoneFrame } from "@/components/marketing/PhoneFrame";
import { PRODUCT_WALKTHROUGH_STEPS, type WalkthroughStep } from "@/components/marketing/walkthrough-steps";

export type ProductWalkthroughProps = {
  /** Optional section heading above the walkthrough */
  heading?: string;
  subheading?: string;
  className?: string;
  steps?: WalkthroughStep[];
  variant?: "light" | "dark";
};

export function ProductWalkthrough({
  heading = "See how ValYoued works",
  subheading = "Four steps from photo to listing, on one ledger.",
  className,
  steps = PRODUCT_WALKTHROUGH_STEPS,
  variant = "light",
}: ProductWalkthroughProps) {
  const reduceMotion = useReducedMotion();
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const dark = variant === "dark";

  useEffect(() => {
    if (reduceMotion) return;
    const nodes = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (nodes.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target) {
          const idx = nodes.indexOf(visible[0].target as HTMLDivElement);
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      { root: null, rootMargin: "-20% 0px -35% 0px", threshold: [0.2, 0.45, 0.7] },
    );

    for (const node of nodes) obs.observe(node);
    return () => obs.disconnect();
  }, [reduceMotion, steps.length]);

  const activeStep = steps[activeIndex] ?? steps[0];

  return (
    <section
      className={cn(
        "relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24",
        dark && "text-white",
        className,
      )}
    >
      <div className="mb-12 max-w-2xl">
        <p className={cn("text-ui-caps", dark ? "text-accent" : "text-accent")}>Product walkthrough</p>
        <h2 className={cn("mt-2 text-3xl font-semibold tracking-tight sm:text-4xl", dark ? "text-white" : "text-foreground")}>
          {heading}
        </h2>
        {subheading ? (
          <p className={cn("mt-3 text-lg leading-relaxed", dark ? "text-white/65" : "text-muted-foreground")}>
            {subheading}
          </p>
        ) : null}
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_minmax(240px,300px)] lg:gap-16">
        <div className="space-y-0 lg:space-y-24">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeIndex;
            return (
              <div
                key={step.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="grid min-h-[min(55vh,420px)] grid-cols-1 items-center gap-8 py-8 lg:min-h-[70vh] lg:py-12"
              >
                <div
                  className={cn(
                    "space-y-4 transition-opacity duration-300 lg:max-w-md",
                    !reduceMotion && !isActive && "opacity-40 lg:opacity-35",
                    isActive && "opacity-100",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      dark ? "bg-accent/20 text-accent" : "bg-accent/10 text-accent",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <p className={cn("text-ui-caps", dark ? "text-white/45" : "text-muted-foreground")}>
                    Step {i + 1}
                  </p>
                  <h3 className={cn("text-2xl font-semibold tracking-tight", dark ? "text-white" : "text-foreground")}>
                    {step.title}
                  </h3>
                  <p className={cn("text-base leading-relaxed", dark ? "text-white/65" : "text-muted-foreground")}>
                    {step.body}
                  </p>
                </div>

                <div className="lg:hidden">
                  <PhoneFrame>{step.screen}</PhoneFrame>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            <motion.div
              key={activeStep.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <PhoneFrame>{activeStep.screen}</PhoneFrame>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
