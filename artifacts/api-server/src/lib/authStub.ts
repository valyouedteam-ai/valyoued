import { logger } from "./logger";

function truthy(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

/**
 * Local/dev only: treat all requests as a fixed user and skip Clerk middleware.
 * Set `AUTH_STUB_MODE=1` together with `VITE_AUTH_STUB_MODE=1` on the web app.
 */
export function isAuthStubMode(): boolean {
  return truthy(process.env.AUTH_STUB_MODE);
}

export function assertStubNotProduction(): void {
  if (!isAuthStubMode()) return;
  if (process.env.NODE_ENV !== "production") return;
  if (truthy(process.env.ALLOW_INSECURE_DEV_STUBS)) {
    logger.warn("AUTH_STUB_MODE is enabled in production (ALLOW_INSECURE_DEV_STUBS=1).");
    return;
  }
  throw new Error(
    "Refusing to start with AUTH_STUB_MODE in production. Unset AUTH_STUB_MODE or set ALLOW_INSECURE_DEV_STUBS=1.",
  );
}

export function authStubUserId(): string {
  return (process.env.AUTH_STUB_USER_ID?.trim() || "dev-stub-user") as string;
}
