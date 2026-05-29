import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, Redirect, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowRight, BriefcaseBusiness, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarketingFullscreenOverlay } from "@/components/marketing/MarketingFullscreenOverlay";
import { useAuthStubContext } from "@/context/AuthStubContext";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import {
  type SellerPersonaChoice,
  isSellerPersonaConfirmed,
  readClerkSellerPersona,
  saveSellerPersonaForSignedInUser,
} from "@/hooks/use-persona-sync";

/** First authenticated step after Clerk signup. Persona must be explicitly confirmed here. */
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
  const [phase, setPhase] = useState<"primer" | "pick" | "ready">("primer");
  const [pickOverride, setPickOverride] = useState(false);

  const confirmed = isSellerPersonaConfirmed(user);
  const clerkPersona = readClerkSellerPersona(user);
  const persona = localPersona ?? (confirmed ? clerkPersona : null) ?? null;

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (confirmed && persona && !pickOverride) {
      setPhase("ready");
    }
  }, [isLoaded, user, confirmed, persona, pickOverride]);

  async function pickPersona(choice: SellerPersonaChoice) {
    if (!user) return;
    setSavingChoice(choice);
    try {
      await saveSellerPersonaForSignedInUser(user, choice);
      setLocalPersona(choice);
      setPickOverride(false);
      setPhase("ready");
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

  if (confirmed && persona && !pickOverride) {
    return <Redirect to="/dashboard" />;
  }

  const nameGreet = firstName();
  const showPrimer = phase === "primer";
  const showPick = phase === "pick" || pickOverride;
  const showReady = phase === "ready" && persona != null && !pickOverride;

  return (
    <div className="min-h-[30vh]" aria-busy={showPrimer || showPick || showReady}>
      <AnimatePresence mode="wait">
        {showPrimer ? (
          <MarketingFullscreenOverlay key="wc-primer" variant="landing" innerMaxWidth="lg">
            <div className="space-y-10">
              <header className="space-y-3 text-center sm:text-left">
                <p className="text-ui-caps text-accent">Welcome</p>
                <h1
                  id="welcome-primer-title"
                  className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-5xl"
                >
                  {nameGreet ? `Hi ${nameGreet}` : "Welcome to ValYoued"}
                </h1>
                <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                  One vault for valuations, portfolio snapshots, and listing drafts when you are ready to sell.
                </p>
              </header>
              <Button
                size="lg"
                className="w-full rounded-full shadow-lg sm:w-auto gap-2"
                onClick={() => setPhase("pick")}
              >
                Continue
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
              </Button>
            </div>
          </MarketingFullscreenOverlay>
        ) : null}

        {showPick ? (
          <MarketingFullscreenOverlay key="wc-pick" variant="landing" innerMaxWidth="xl">
            <div className="space-y-8">
              <header className="space-y-2 text-center sm:text-left">
                <p className="text-ui-caps text-accent">One quick choice</p>
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  How will you mostly use ValYoued?
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  This shapes wording and shortcuts, not billing. You can change it later in Profile.
                </p>
              </header>
              {pickOverride ? (
                <button
                  type="button"
                  className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                  onClick={() => setPickOverride(false)}
                >
                  Keep current setting
                </button>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <PersonaCard
                  title="Everyday steward"
                  description="Personal collections, wardrobes, and side-hustle resale."
                  icon={Shirt}
                  disabled={savingChoice !== null}
                  loading={savingChoice === "everyday"}
                  onPick={() => pickPersona("everyday")}
                />
                <PersonaCard
                  title="Professional desks"
                  description="Brokers, boutiques, and listing-heavy resale work."
                  icon={BriefcaseBusiness}
                  highlighted
                  disabled={savingChoice !== null}
                  loading={savingChoice === "professional"}
                  onPick={() => pickPersona("professional")}
                />
              </div>
            </div>
          </MarketingFullscreenOverlay>
        ) : null}

        {showReady ? (
          <MarketingFullscreenOverlay key="wc-ready" variant="landing" innerMaxWidth="lg">
            <div className="space-y-8 text-center sm:text-left">
              <header className="space-y-2">
                <p className="text-ui-caps text-accent">All set</p>
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {persona === "professional"
                    ? "Tuned for resale work"
                    : "Tuned for personal holdings"}
                </h1>
                <p className="text-pretty text-base leading-relaxed text-muted-foreground">
                  {persona === "professional"
                    ? "Sharper listing language, desk workspaces when you subscribe, and denser History and Ads flows."
                    : "Friendlier summaries, portfolio snapshots, and a gentle path from valuation to listing draft."}
                </p>
              </header>
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

function PersonaCard({
  title,
  description,
  icon: Icon,
  highlighted,
  disabled,
  loading,
  onPick,
}: {
  title: string;
  description: string;
  icon: typeof Shirt;
  highlighted?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPick: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-5 shadow-lg transition-shadow",
        highlighted ? "border-accent/35 bg-accent/12 ring-1 ring-accent/25" : "border-border/70 bg-card/98",
      )}
    >
      <div
        className={cn(
          "mb-3 flex h-11 w-11 items-center justify-center rounded-2xl",
          highlighted ? "bg-card text-accent" : "bg-accent/15 text-accent",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Button className="mt-5 w-full rounded-2xl" disabled={disabled} onClick={onPick}>
        {loading ? (
          <>Saving...</>
        ) : (
          <>
            Continue
            <ArrowRight className="ml-2 h-5 w-5 shrink-0" aria-hidden />
          </>
        )}
      </Button>
    </div>
  );
}
