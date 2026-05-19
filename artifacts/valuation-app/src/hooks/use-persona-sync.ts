import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";

export const PERSONA_SESSION_KEY = "valyoued.sellerPersona";
export type SellerPersonaChoice = "everyday" | "professional";

/** Sync onboarding persona from sessionStorage into Clerk `unsafeMetadata` once after sign-up. */
export function useSellerPersonaClerkSync() {
  const { user, isLoaded } = useUser();
  const done = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || done.current) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PERSONA_SESSION_KEY);
    } catch {
      return;
    }
    if (raw !== "everyday" && raw !== "professional") return;

    const existing = user.unsafeMetadata?.sellerPersona;
    if (existing === raw) {
      done.current = true;
      return;
    }

    done.current = true;
    void user
      .update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          sellerPersona: raw as SellerPersonaChoice,
        },
      })
      .catch(() => {
        done.current = false;
      });
  }, [isLoaded, user]);
}
