import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";

export const PERSONA_SESSION_KEY = "valyoued.sellerPersona";
export type SellerPersonaChoice = "everyday" | "professional";

/** Minimal Clerk user shape for onboarding metadata patches (avoids a hard dependency on `@clerk/types`). */
export type ClerkUserPersonaWritable = {
  unsafeMetadata?: Record<string, unknown> | undefined;
  update: (args: {
    unsafeMetadata: Record<string, unknown>;
  }) => Promise<unknown>;
};

/** Read persona from session (set on /welcome) before Clerk metadata catches up after sign-up. */
export function peekSessionSellerPersona(): SellerPersonaChoice | undefined {
  try {
    const raw = sessionStorage.getItem(PERSONA_SESSION_KEY);
    return raw === "everyday" || raw === "professional" ? raw : undefined;
  } catch {
    return undefined;
  }
}

/** Persist persona to sessionStorage and Clerk for signed-in onboarding. */
export async function saveSellerPersonaForSignedInUser(
  user: ClerkUserPersonaWritable,
  choice: SellerPersonaChoice,
): Promise<void> {
  try {
    sessionStorage.setItem(PERSONA_SESSION_KEY, choice);
  } catch {
    /* ignore */
  }
  await user.update({
    unsafeMetadata: {
      ...user.unsafeMetadata,
      sellerPersona: choice,
    },
  });
}

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
