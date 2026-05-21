import { useMemo, useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowRight, BriefcaseBusiness, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/** First authenticated step after Clerk sign-up: confirm persona defaults, then jump into the app (lightweight copy step). */
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

  /** Session persists from `/welcome`; metadata sync can lag one tick after signup. */
  const sessionPeek = useMemo(() => peekSessionSellerPersona(), []);
  const fromClerkRaw = user?.unsafeMetadata?.sellerPersona;
  const fromClerk: SellerPersonaChoice | undefined =
    fromClerkRaw === "everyday" || fromClerkRaw === "professional" ? fromClerkRaw : undefined;
  const persona = localPersona ?? fromClerk ?? sessionPeek ?? null;

  async function pickPersona(choice: SellerPersonaChoice) {
    if (!user) return;
    setSavingChoice(choice);
    try {
      await saveSellerPersonaForSignedInUser(user, choice);
      setLocalPersona(choice);
    } catch {
      /* ignore, user can retry */
    } finally {
      setSavingChoice(null);
    }
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

  let personaHeading = "Choose how ValYoued should tailor your dashboard.";
  if (persona === "professional") {
    personaHeading = "We set your dashboard for professional desks.";
  } else if (persona === "everyday") {
    personaHeading = "We set your dashboard for everyday stewarding.";
  }

  let personaLead =
    "You skipped the track picker before sign-up or opened this link twice. Tap one preset so Home can match how you trade.";
  if (persona === "professional") {
    personaLead =
      "You get sharper wording defaults, workspace cues, and listing-heavy shortcuts. Flip tracks anytime.";
  } else if (persona === "everyday") {
    personaLead =
      "You get approachable copy, portfolio snaps, and quick listing drafts tuned for resale and collections.";
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 pb-8">
      <header className="space-y-3">
        <p className="text-ui-caps text-accent">You're signed in</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {personaHeading}
        </h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">{personaLead}</p>
      </header>

      {!persona ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Shirt className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-base font-semibold tracking-tight">Everyday steward</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Personal wardrobes, resale, and collectors who want approachable guidance.
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
                  Use Everyday defaults
                  <ArrowRight className="ml-2 h-5 w-5 shrink-0" aria-hidden />
                </>
              )}
            </Button>
          </div>

          <div className="rounded-3xl border border-accent/35 bg-accent/10 p-5 shadow-lg ring-1 ring-accent/20">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-accent">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-base font-semibold tracking-tight">Professional desk</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Boutiques, brokers, heirs, desks that rely on sharper language and repeatable listings.
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
                  Use Professional defaults
                  <ArrowRight className="ml-2 h-5 w-5 shrink-0" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setLocation("/dashboard")}
        >
          Continue to Home
          <ArrowRight className="ml-2 h-5 w-5 shrink-0" aria-hidden />
        </Button>
        <Button variant="outline" size="lg" className="rounded-full" asChild>
          <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>Run a valuation</Link>
        </Button>
      </div>
    </div>
  );
}
