import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/react";
import type { SellerPersonaChoice } from "@/hooks/use-persona-sync";
import { peekSessionSellerPersona } from "@/hooks/use-persona-sync";
import { useOptionalStubBillingPlanDev } from "@/context/StubBillingPlanDevContext";
import { useAuthStubContext } from "@/context/AuthStubContext";

export type SellerPersonaResolved = SellerPersonaChoice | null;

export type SellerPersonaPack = {
  persona: SellerPersonaResolved;
  headlineForHome: string;
  sublineForHome: string;
  isProfessional: boolean;
};

const SellerPersonaContext = createContext<SellerPersonaPack | null>(null);

function personaPackForStubBillingPlan(planSlugInput: string | undefined): SellerPersonaPack {
  const persona: SellerPersonaResolved = planSlugInput === "professional" ? "professional" : "everyday";
  const isProfessional = persona === "professional";

  if (persona === "professional") {
    return {
      persona,
      isProfessional,
      headlineForHome: "Your trading desk cockpit",
      sublineForHome:
        "Scan bucket mix, desks, valuations, listings, then jump into sharper ads or arbitrage-heavy runs when you subscribe.",
    };
  }

  return {
    persona,
    isProfessional,
    headlineForHome: "Your portfolio at a glance",
    sublineForHome:
      "Track net worth snapshots by bucket, revisit monitors, draft listings, then upgrade whenever you want deeper market rows.",
  };
}

/** Auth stub dashboards: derives persona from the stub billing plan toggle (desk vs portfolio shell). */
function SellerPersonaFromStubBillingInner({ children }: { children: ReactNode }) {
  const stubBilling = useOptionalStubBillingPlanDev();
  const planSlug = stubBilling?.planSlug;
  const pack = useMemo(() => personaPackForStubBillingPlan(planSlug), [planSlug]);
  return (
    <SellerPersonaContext.Provider value={pack}>{children}</SellerPersonaContext.Provider>
  );
}

function SellerPersonaFromClerkInner({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();

  const pack = useMemo((): SellerPersonaPack => {
    const fromClerkRaw = user?.unsafeMetadata?.sellerPersona;
    const fromClerk: SellerPersonaResolved =
      fromClerkRaw === "everyday" || fromClerkRaw === "professional" ? fromClerkRaw : null;
    const persona: SellerPersonaResolved =
      isLoaded === false ? (peekSessionSellerPersona() ?? null) : fromClerk ?? peekSessionSellerPersona() ?? null;

    const isProfessional = persona === "professional";

    if (persona === "professional") {
      return {
        persona,
        isProfessional,
        headlineForHome: "Your trading desk cockpit",
        sublineForHome:
          "Scan bucket mix, desks, valuations, listings, then jump into sharper ads or arbitrage-heavy runs when you subscribe.",
      };
    }

    return {
      persona,
      isProfessional,
      headlineForHome: "Your portfolio at a glance",
      sublineForHome:
        "Track net worth snapshots by bucket, revisit monitors, draft listings, then upgrade whenever you want deeper market rows.",
    };
  }, [isLoaded, user]);

  return <SellerPersonaContext.Provider value={pack}>{children}</SellerPersonaContext.Provider>;
}

/**
 * Mounted for every signed-in dashboard shell (Clerk-backed or auth stub).
 * Keeps Clerk `useUser` out of flows that omit ClerkProvider.
 */
export function SellerPersonaProvider({
  children,
}: {
  children: ReactNode;
}) {
  const authStub = useAuthStubContext();
  if (authStub) return <SellerPersonaFromStubBillingInner>{children}</SellerPersonaFromStubBillingInner>;
  return <SellerPersonaFromClerkInner>{children}</SellerPersonaFromClerkInner>;
}

export function useSellerPersona(): SellerPersonaPack {
  const ctx = useContext(SellerPersonaContext);
  if (!ctx) throw new Error("useSellerPersona must be rendered inside SellerPersonaProvider.");
  return ctx;
}
