import { isAuthStubMode } from "./authStub";

export function parseAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAdminUserId(userId: string): boolean {
  const admins = parseAdminUserIds();
  if (admins.size === 0) {
    /** Local/auth-stub dev: single synthetic user; allow admin routes without ADMIN_USER_IDS. */
    return isAuthStubMode();
  }
  return admins.has(userId);
}
