export const PERSONA_SESSION_KEY = "valyoued.sellerPersona";
export type SellerPersonaChoice = "everyday" | "professional";

/** Minimal Clerk user shape for onboarding metadata checks. */
export type ClerkUserPersonaReadable = {
  unsafeMetadata?: Record<string, unknown> | undefined;
};

/** Read persona from session (set from `/welcome` as a hint only). */
export function peekSessionSellerPersona(): SellerPersonaChoice | undefined {
  try {
    const raw = sessionStorage.getItem(PERSONA_SESSION_KEY);
    return raw === "everyday" || raw === "professional" ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function readClerkSellerPersona(
  user: ClerkUserPersonaReadable | null | undefined,
): SellerPersonaChoice | undefined {
  const raw = user?.unsafeMetadata?.sellerPersona;
  return raw === "everyday" || raw === "professional" ? raw : undefined;
}

/** True only after the user explicitly confirmed on `/welcome/continue`. */
export function isSellerPersonaConfirmed(user: ClerkUserPersonaReadable | null | undefined): boolean {
  return user?.unsafeMetadata?.sellerPersonaConfirmed === true;
}

/** Minimal Clerk user shape for onboarding metadata patches. */
export type ClerkUserPersonaWritable = ClerkUserPersonaReadable & {
  update: (args: { unsafeMetadata: Record<string, unknown> }) => Promise<unknown>;
};

/** Persist persona and mark onboarding complete for signed-in users. */
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
      sellerPersonaConfirmed: true,
    },
  });
}
