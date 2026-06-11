import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PhoneFrame } from "@/components/marketing/PhoneFrame";
import { PRODUCT_WALKTHROUGH_STEPS, WALKTHROUGH_SCREEN_HEIGHT_PX, type WalkthroughStep } from "@/components/marketing/walkthrough-steps";

export type ProductWalkthroughProps = {
  /** Optional section heading above the walkthrough */
  heading?: string;
  subheading?: string;
  className?: string;
  steps?: WalkthroughStep[];
  variant?: "light" | "dark";
  /** When true, steps advance on a timer instead of scroll position. */
  autoAdvance?: boolean;
  /** Milliseconds each step stays visible when `autoAdvance` is on. */
  stepDurationMs?: number;
  /** Fires once after the first full pass through all steps (auto-advance mode only). */
  onCycleComplete?: () => void;
  /** `hero` embeds the walkthrough beside page hero copy instead of a standalone section. */
  layout?: "section" | "hero";
  /** Content above the cycling step copy when `layout="hero"`. */
  heroLeading?: ReactNode;
  /** Content below step controls when `layout="hero"`. */
  heroTrailing?: ReactNode;
  /** Show the default section heading block. Off by default for `layout="hero"`. */
  showHeader?: boolean;
};

const DEFAULT_STEP_MS = 4500;

function WalkthroughPhone({
  stepId,
  screen,
  reduceMotion,
}: {
  stepId: string;
  screen: WalkthroughStep["screen"];
  reduceMotion: boolean | null;
}) {
  return (
    <PhoneFrame className="w-[min(100%,280px)]">
      <div
        className="relative overflow-hidden"
        style={{ height: WALKTHROUGH_SCREEN_HEIGHT_PX }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepId}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            {screen}
          </motion.div>
        </AnimatePresence>
      </div>
    </PhoneFrame>
  );
}

function StepCopy({
  step,
  stepIndex,
  dark,
  className,
}: {
  step: WalkthroughStep;
  stepIndex: number;
  dark: boolean;
  className?: string;
}) {
  const Icon = step.icon;
  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          dark ? "bg-accent/20 text-accent" : "bg-accent/10 text-accent",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className={cn("text-ui-caps", dark ? "text-white/45" : "text-muted-foreground")}>Step {stepIndex + 1}</p>
      <h3 className={cn("text-2xl font-semibold tracking-tight", dark ? "text-white" : "text-foreground")}>
        {step.title}
      </h3>
      <p className={cn("text-base leading-relaxed", dark ? "text-white/65" : "text-muted-foreground")}>{step.body}</p>
    </div>
  );
}

export function ProductWalkthrough({
  heading = "See how ValYoued works",
  subheading = "Four steps from photo to listing, in one place.",
  className,
  steps = PRODUCT_WALKTHROUGH_STEPS,
  variant = "light",
  autoAdvance = false,
  stepDurationMs = DEFAULT_STEP_MS,
  onCycleComplete,
  layout = "section",
  heroLeading,
  heroTrailing,
  showHeader,
}: ProductWalkthroughProps) {
  const reduceMotion = useReducedMotion();
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cycleCompleteRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const dark = variant === "dark";
  const heroLayout = layout === "hero";
  const headerVisible = showHeader ?? !heroLayout;
  const activeStep = steps[activeIndex] ?? steps[0];

  const markCycleComplete = useCallback(() => {
    if (cycleCompleteRef.current) return;
    cycleCompleteRef.current = true;
    onCycleComplete?.();
  }, [onCycleComplete]);

  useEffect(() => {
    if (autoAdvance || reduceMotion) return;
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
  }, [autoAdvance, reduceMotion, steps.length]);

  useEffect(() => {
    if (!autoAdvance || reduceMotion || isPaused) return;

    setProgress(0);
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      setProgress(Math.min(1, elapsed / stepDurationMs));
      if (elapsed >= stepDurationMs) {
        setActiveIndex((current) => {
          const next = (current + 1) % steps.length;
          if (current === steps.length - 1) markCycleComplete();
          return next;
        });
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, autoAdvance, isPaused, markCycleComplete, reduceMotion, stepDurationMs, steps.length]);

  function selectStep(index: number) {
    setActiveIndex(index);
    setProgress(0);
  }

  const stepControls = (
    <div className={cn("space-y-4", heroLayout ? "" : "mt-10")}>
      <div
        className={cn(
          "h-1 overflow-hidden rounded-full bg-border/70",
          heroLayout ? "max-w-sm" : "mx-auto max-w-xs",
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label={`Step ${activeIndex + 1} of ${steps.length}`}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-75 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div
        className={cn("flex flex-wrap items-center gap-2", heroLayout ? "justify-start" : "justify-center")}
        role="tablist"
        aria-label="Walkthrough steps"
      >
        {steps.map((step, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`Step ${i + 1}: ${step.title}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? dark
                    ? "bg-white text-[hsl(222,32%,8%)]"
                    : "bg-foreground text-background"
                  : dark
                    ? "bg-white/10 text-white/70 hover:bg-white/15"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              onClick={() => selectStep(i)}
            >
              {i + 1}. {step.title}
            </button>
          );
        })}
      </div>

      {!reduceMotion && !heroLayout ? (
        <p className="text-center text-xs text-muted-foreground">
          {isPaused ? "Paused. Move the pointer away to resume." : "Advancing automatically. Hover or focus to pause."}
        </p>
      ) : null}
    </div>
  );

  const animatedStepCopy = (
    <div className={cn("relative", heroLayout ? "min-h-[168px]" : "min-h-[220px] lg:min-h-[260px]")}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeStep.id}
          initial={reduceMotion ? false : { opacity: 0, x: -12 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: 12 }}
          transition={{ duration: 0.35 }}
          className={cn(heroLayout ? "max-w-lg" : "lg:max-w-md")}
        >
          <StepCopy step={activeStep} stepIndex={activeIndex} dark={dark} />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const sectionHeader = headerVisible ? (
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
  ) : null;

  if (autoAdvance && heroLayout) {
    return (
      <section
        className={cn(
          "relative z-10 mx-auto max-w-6xl px-4 sm:px-6",
          dark && "text-white",
          className,
        )}
        aria-roledescription="carousel"
        aria-label="Product walkthrough"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false);
        }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(240px,300px)] lg:gap-16">
          <div className="space-y-8">
            {heroLeading}

            <div className="flex justify-center lg:hidden">
              <WalkthroughPhone stepId={activeStep.id} screen={activeStep.screen} reduceMotion={reduceMotion} />
            </div>

            {animatedStepCopy}
            {stepControls}
            {heroTrailing}
          </div>

          <div className="hidden justify-self-center lg:block lg:justify-self-end">
            <WalkthroughPhone stepId={activeStep.id} screen={activeStep.screen} reduceMotion={reduceMotion} />
          </div>
        </div>
      </section>
    );
  }

  if (autoAdvance) {
    return (
      <section
        className={cn(
          "relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24",
          dark && "text-white",
          className,
        )}
        aria-roledescription="carousel"
        aria-label="Product walkthrough"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false);
        }}
      >
        {sectionHeader}

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(240px,300px)] lg:gap-16">
          <div>{animatedStepCopy}</div>

          <div className="justify-self-center lg:justify-self-end">
            <WalkthroughPhone stepId={activeStep.id} screen={activeStep.screen} reduceMotion={reduceMotion} />
          </div>
        </div>

        {stepControls}
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24",
        dark && "text-white",
        className,
      )}
    >
      {sectionHeader}

      <div className="grid gap-12 lg:grid-cols-[1fr_minmax(240px,300px)] lg:gap-16">
        <div className="space-y-0 lg:space-y-24">
          {steps.map((step, i) => {
            const isActive = i === activeIndex;
            return (
              <div
                key={step.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="grid min-h-[min(55vh,420px)] grid-cols-1 items-center gap-8 py-8 lg:min-h-[70vh] lg:py-12"
              >
                <StepCopy
                  step={step}
                  stepIndex={i}
                  dark={dark}
                  className={cn(
                    "transition-opacity duration-300 lg:max-w-md",
                    !reduceMotion && !isActive && "opacity-40 lg:opacity-35",
                    isActive && "opacity-100",
                  )}
                />

                <div className="lg:hidden">
                  <WalkthroughPhone stepId={step.id} screen={step.screen} reduceMotion={reduceMotion} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24">
            <WalkthroughPhone stepId={activeStep.id} screen={activeStep.screen} reduceMotion={reduceMotion} />
          </div>
        </div>
      </div>
    </section>
  );
}
