import { useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, Redirect, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowRight, BriefcaseBusiness, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingFullscreenOverlay } from "@/components/marketing/MarketingFullscreenOverlay";
import { useAuthStubContext } from "@/context/AuthStubContext";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import {
  type SellerPersonaChoice,
  peekSessionSellerPersona,
  saveSellerPersonaForSignedInUser,
} from "@/hooks/use-persona-sync";

/** First authenticated step after Clerk signup: fullscreen overlay phases mirror the landing intro pattern. */
export default function WelcomeContinuePage() {
  const authStub = useAuthStubContext();
  if (authStub) {
    return <Redirect to="/dashboard" />;
  }
  return <WelcomeContinueSignedIn />;
}

function WelcomeContinueSignedIn() {
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useUser();
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const [localPersona, setLocalPersona] = useState<SellerPersonaChoice | null>(null);
  const [savingChoice, setSavingChoice] = useState<SellerPersonaChoice | null>(null);
  const [introSeen, setIntroSeen] = useState(false);
  const [pickOverride, setPickOverride] = useState(false);

  const sessionPeek = useMemo(() => peekSessionSellerPersona(), []);
  const fromClerkRaw = user?.unsafeMetadata?.sellerPersona;
  const fromClerk: SellerPersonaChoice | undefined =
    fromClerkRaw === "everyday" || fromClerkRaw === "professional" ? fromClerkRaw : undefined;
  const persona = localPersona ?? fromClerk ?? sessionPeek ?? null;

  /** Skip primer before paint whenever a persona is already persisted (session or Clerk metadata). */
  useLayoutEffect(() => {
    if (!isLoaded || !user) return;
    if (persona) setIntroSeen(true);
  }, [isLoaded, user, persona]);

  async function pickPersona(choice: SellerPersonaChoice) {
    if (!user) return;
    setSavingChoice(choice);
    try {
      await saveSellerPersonaForSignedInUser(user, choice);
      setLocalPersona(choice);
      setPickOverride(false);
    } catch {
      /* ignore, user can retry */
    } finally {
      setSavingChoice(null);
    }
  }

  function firstName() {
    const f = user?.firstName?.trim();
    if (f) return f;
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    const local = email.split("@")[0] ?? "";
    return local.replace(/[\W_]+/g, " ").trim() || "";
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/sign-in" />;
  }

  const nameGreet = firstName();
  const showPrimerOverlay = persona == null && !introSeen;
  const showPick = pickOverride || (introSeen && persona == null);
  const showPickOverlay = Boolean(showPick);
  const showReadyOverlay = persona != null && !pickOverride;

  function pickHeadline() {
    if (pickOverride && persona) return "Pick the option that fits best";
    return "One quick preference";
  }

  function readyHeadline(): string {
    return persona === "professional"
      ? "We will tune things for resale work"
      : "We will tune things around your personal holdings";
  }

  function readyLead(): string {
    return persona === "professional"
      ? "Expect quicker paths to sharper listing language, workspaces when you subscribe to Professional, and more density on History and Ads. Swap this anytime under Profile."
      : "Expect friendlier summaries, snapshots of what is in your vault, and a gentle path from a valuation toward a marketplace draft.";
  }

  return (
    <div className="min-h-[30vh]" aria-busy={showPrimerOverlay || showPickOverlay || showReadyOverlay}>
      <AnimatePresence mode="wait">
        {showPrimerOverlay ? (
          <MarketingFullscreenOverlay key="wc-primer" variant="landing" innerMaxWidth="lg">
            <div className="space-y-8">
              <header className="space-y-3 text-center sm:text-left">
                <p className="text-ui-caps text-accent">You are signed in</p>
                <h1
                  id="welcome-primer-title"
                  className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                >
                  {nameGreet ? `Nice to meet you, ${nameGreet}` : "Nice to meet you"}
                </h1>
              </header>
              <div className="space-y-6 rounded-3xl border border-border/70 bg-card/98 p-6 shadow-xl">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  ValYoued is a vault for valuations: you capture item details once, revisit numbers later, and can spin up marketplace draft
                  text when something is ready to move. Paid tiers unlock more rows and alerts, while the guided Home screen keeps tasks in
                  plain language.
                </p>
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  <li>Save finished reports alongside photos and notes instead of juggling spreadsheets.</li>
                  <li>Jump between a valuation wizard, portfolio snapshots, and ad drafts whenever you need them.</li>
                  <li>Switch or refine how the app speaks to you at any point from Profile.</li>
                </ul>
              </div>
              <Button
                size="lg"
                className="w-full rounded-full shadow-lg sm:w-auto gap-2"
                onClick={() => setIntroSeen(true)}
              >
                Continue
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
              </Button>
            </div>
          </MarketingFullscreenOverlay>
        ) : null}

        {showPickOverlay ? (
          <MarketingFullscreenOverlay key="wc-pick" variant="landing" innerMaxWidth="xl">
            <div className="space-y-8">
              <header className="space-y-2 text-center sm:text-left">
                <p className="text-ui-caps text-accent">You are signed in</p>
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {pickHeadline()}
                </h1>
              </header>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1 text-center sm:text-left">
                  <p className="text-sm font-medium text-foreground">Which sounds closest to you right now?</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Pick the option that matches most days. Labels only change wording and shortcuts, not billing.
                  </p>
                </div>
                {pickOverride ? (
                  <button
                    type="button"
                    className="shrink-0 text-sm font-medium text-accent underline-offset-4 hover:underline mx-auto sm:mx-0"
                    onClick={() => setPickOverride(false)}
                  >
                    Keep current setting
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/70 bg-card/98 p-5 shadow-lg">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <Shirt className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Everyday steward</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Personal collections, wardrobes, resale side-hustles, and single big-ticket buys you want monitored.
                  </p>
                  <Button
                    className="mt-5 w-full rounded-2xl"
                    disabled={savingChoice !== null}
                    onClick={() => pickPersona("everyday")}
                  >
                    {savingChoice === "everyday" ? (
                      <>Saving...</>
                    ) : (
                      <>
                        Continue · Everyday track
                        <ArrowRight className="ml-2 h-5 w-5 shrink-0" aria-hidden />
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-3xl border border-accent/35 bg-accent/12 p-5 shadow-lg ring-1 ring-accent/25">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-accent">
                    <BriefcaseBusiness className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Professional desks</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Brokers, heirs, boutiques, desks that need sharper arbitrage wording, workspace separation, and listing-heavy flows.
                  </p>
                  <Button
                    className="mt-5 w-full rounded-2xl shadow-md"
                    disabled={savingChoice !== null}
                    onClick={() => pickPersona("professional")}
                  >
                    {savingChoice === "professional" ? (
                      <>Saving...</>
                    ) : (
                      <>
                        Continue · Professional track
                        <ArrowRight className="ml-2 h-5 w-5 shrink-0" aria-hidden />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </MarketingFullscreenOverlay>
        ) : null}

        {showReadyOverlay ? (
          <MarketingFullscreenOverlay key="wc-ready" variant="landing" innerMaxWidth="lg">
            <div className="space-y-8 text-center sm:text-left">
              <header className="space-y-2">
                <p className="text-ui-caps text-accent">You are signed in</p>
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{readyHeadline()}</h1>
                <p className="text-pretty leading-relaxed text-muted-foreground">{readyLead()}</p>
              </header>
              <div className="rounded-3xl border border-border/70 bg-card/98 p-5 shadow-md">
                <p className="text-sm text-muted-foreground">
                  Prefer the other option?{" "}
                  <button
                    type="button"
                    className="font-medium text-accent underline-offset-4 hover:underline"
                    onClick={() => setPickOverride(true)}
                  >
                    Choose again
                  </button>
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                <Button size="lg" className="rounded-full shadow-lg gap-2" onClick={() => setLocation("/dashboard")}>
                  Continue to Home
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                </Button>
                <Button variant="outline" size="lg" className="rounded-full" asChild>
                  <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>Run a valuation</Link>
                </Button>
              </div>
            </div>
          </MarketingFullscreenOverlay>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
