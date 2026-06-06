import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildWorkspaceGuideSteps,
  type WorkspaceGuideStep,
} from "@/components/onboarding/workspace-guide-steps";
import {
  completeWorkspaceGuide,
  isWorkspaceGuideCompleted,
} from "@/components/onboarding/workspace-guide-storage";

const SPOTLIGHT_PAD = 10;

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function queryGuideTarget(target: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-workspace-guide="${target}"]`);
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

function measureTarget(target: string): SpotlightRect | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-workspace-guide="${target}"]`);
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    return {
      top: rect.top - SPOTLIGHT_PAD,
      left: rect.left - SPOTLIGHT_PAD,
      width: rect.width + SPOTLIGHT_PAD * 2,
      height: rect.height + SPOTLIGHT_PAD * 2,
    };
  }
  return null;
}

function SpotlightShade({ rect }: { rect: SpotlightRect }) {
  const top = Math.max(0, rect.top);
  const left = Math.max(0, rect.left);
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const shade = "fixed z-[120] bg-black/55";

  return (
    <>
      <div className={shade} style={{ top: 0, left: 0, right: 0, height: top }} aria-hidden />
      <div className={shade} style={{ top, left: 0, width: left, height: bottom - top }} aria-hidden />
      <div className={shade} style={{ top, left: right, right: 0, height: bottom - top }} aria-hidden />
      <div className={shade} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} aria-hidden />
    </>
  );
}

function SpotlightRing({ rect }: { rect: SpotlightRect }) {
  return (
    <div
      className="pointer-events-none fixed z-[121] rounded-2xl ring-2 ring-violet-500 ring-offset-2 ring-offset-background"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      aria-hidden
    />
  );
}

function GuidePopover({
  step,
  stepIndex,
  stepCount,
  rect,
  triedInteraction,
  onBack,
  onNext,
  onSkip,
}: {
  step: WorkspaceGuideStep;
  stepIndex: number;
  stepCount: number;
  rect: SpotlightRect | null;
  triedInteraction: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const isLast = stepIndex === stepCount - 1;
  const card = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-guide-title"
      className={cn(
        "z-[122] w-[min(calc(100vw-2rem),22rem)] rounded-2xl border border-violet-500/25 bg-card p-5 shadow-2xl",
        rect ? "fixed" : "relative mx-auto",
      )}
      style={
        rect
          ? (() => {
              const cardWidth = Math.min(window.innerWidth - 32, 352);
              const preferredTop =
                step.placement === "top"
                  ? rect.top - 16
                  : rect.top + rect.height + 16;
              const top =
                step.placement === "top"
                  ? Math.max(16, preferredTop - 180)
                  : Math.min(window.innerHeight - 16, preferredTop);
              const left = Math.min(
                Math.max(16, rect.left + rect.width / 2 - cardWidth / 2),
                window.innerWidth - cardWidth - 16,
              );
              return { top, left, width: cardWidth };
            })()
          : undefined
      }
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-ui-caps text-violet-700 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Step {stepIndex + 1} of {stepCount}
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onSkip}
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h2 id="workspace-guide-title" className="text-lg font-semibold tracking-tight text-foreground">
        {step.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      {step.interactive ? (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            triedInteraction ? "text-emerald-700 dark:text-emerald-400" : "text-violet-800 dark:text-violet-300",
          )}
        >
          {triedInteraction ? "Nice. Continue when you are ready." : "Try the highlighted control, then continue."}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onBack}>
            Back
          </Button>
        ) : null}
        <Button type="button" size="sm" className="rounded-full" onClick={onNext}>
          {isLast ? (
            <>
              Got it
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        {!isLast ? (
          <button
            type="button"
            className="ml-auto text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={onSkip}
          >
            Skip tour
          </button>
        ) : null}
      </div>
    </div>
  );

  if (!rect) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4">
        {card}
      </div>
    );
  }

  return card;
}

/**
 * First-time interactive walkthrough for workspace navigation. Completion is persisted in localStorage.
 */
export function WorkspaceGuideTour() {
  const isMobile = useIsMobile();
  const [pathname] = useLocation();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [triedInteraction, setTriedInteraction] = useState(false);
  const [pathnameAtStepStart, setPathnameAtStepStart] = useState<string | null>(null);

  const steps = useMemo(() => buildWorkspaceGuideSteps(isMobile), [isMobile]);
  const step = steps[stepIndex] ?? steps[0];
  const stepCount = steps.length;

  useEffect(() => {
    setActive(!isWorkspaceGuideCompleted());
  }, []);

  const finish = useCallback(() => {
    completeWorkspaceGuide();
    setActive(false);
  }, []);

  const goToStep = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= stepCount) {
        finish();
        return;
      }
      setStepIndex(nextIndex);
    },
    [finish, stepCount],
  );

  useLayoutEffect(() => {
    if (!active || !step?.target) {
      setSpotlight(null);
      return;
    }

    let cancelled = false;

    function refresh() {
      if (cancelled) return;
      const next = measureTarget(step.target!);
      if (!next && step.skipIfMissing) {
        goToStep(stepIndex + 1);
        return;
      }
      setSpotlight(next);
    }

    refresh();
    const raf = window.requestAnimationFrame(refresh);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [active, goToStep, step, stepIndex]);

  useEffect(() => {
    if (!active || !step?.interactive || triedInteraction) return;
    if (pathnameAtStepStart != null && pathname !== pathnameAtStepStart) {
      setTriedInteraction(true);
    }
  }, [active, pathname, pathnameAtStepStart, step?.interactive, triedInteraction]);

  useEffect(() => {
    if (!active || !step?.interactive || triedInteraction || !step.target) return;

    const nodes = document.querySelectorAll<HTMLElement>(`[data-workspace-guide="${step.target}"]`);
    const listeners: Array<{ el: HTMLElement; fn: () => void }> = [];

    function markTried() {
      setTriedInteraction(true);
    }

    nodes.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      el.addEventListener("click", markTried);
      listeners.push({ el, fn: markTried });
    });

    return () => {
      listeners.forEach(({ el, fn }) => el.removeEventListener("click", fn));
    };
  }, [active, step?.interactive, step?.target, triedInteraction]);

  useEffect(() => {
    if (!active) return;
    setPathnameAtStepStart(pathname);
    setTriedInteraction(false);
  }, [active, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps -- capture pathname when the tour or step changes

  if (!active || !step) return null;

  const layer = (
    <>
      {step.target && spotlight ? (
        <>
          <SpotlightShade rect={spotlight} />
          <SpotlightRing rect={spotlight} />
        </>
      ) : null}
      <GuidePopover
        step={step}
        stepIndex={stepIndex}
        stepCount={stepCount}
        rect={step.target && spotlight ? spotlight : null}
        triedInteraction={triedInteraction}
        onBack={() => goToStep(Math.max(0, stepIndex - 1))}
        onNext={() => goToStep(stepIndex + 1)}
        onSkip={finish}
      />
    </>
  );

  return createPortal(layer, document.body);
}
