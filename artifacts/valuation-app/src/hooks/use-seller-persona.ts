import { useMemo } from "react";
import { useUser } from "@clerk/react";
import type { SellerPersonaChoice } from "@/hooks/use-persona-sync";
import { peekSessionSellerPersona } from "@/hooks/use-persona-sync";

export type SellerPersonaResolved = SellerPersonaChoice | null;

/**
 * Mirrors `/welcome`: prefers Clerk unsafeMetadata once loaded, then sessionStorage persona from landing funnel.
 */
export function useSellerPersona(): {
  persona: SellerPersonaResolved;
  headlineForHome: string;
  sublineForHome: string;
  isProfessional: boolean;
} {
  const { user, isLoaded } = useUser();

  return useMemo(() => {
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
}
