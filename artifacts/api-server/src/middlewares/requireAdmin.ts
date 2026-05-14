import type { Request, Response, NextFunction } from "express";
import { isAuthStubMode } from "../lib/authStub";
import { getUserId } from "./requireAuth";

function adminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "You need to sign in to do that." });
    return;
  }
  const admins = adminUserIds();
  if (admins.size === 0) {
    /** Local/auth-stub dev: single synthetic user — allow admin routes without ADMIN_USER_IDS. */
    if (isAuthStubMode()) {
      next();
      return;
    }
    res.status(503).json({
      error:
        "Admin access is not configured (set ADMIN_USER_IDS to a comma-separated list of Clerk user IDs).",
    });
    return;
  }
  if (!admins.has(userId)) {
    res.status(403).json({ error: "Forbidden." });
    return;
  }
  next();
}
