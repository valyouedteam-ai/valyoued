import type { Request, Response, NextFunction } from "express";
import { isAdminUserId, parseAdminUserIds } from "../lib/adminAccess";
import { isAuthStubMode } from "../lib/authStub";
import { getUserId } from "./requireAuth";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "You need to sign in to do that." });
    return;
  }
  const admins = parseAdminUserIds();
  if (admins.size === 0 && !isAuthStubMode()) {
    res.status(503).json({
      error:
        "Admin access is not configured (set ADMIN_USER_IDS to a comma-separated list of Clerk user IDs).",
    });
    return;
  }
  if (!isAdminUserId(userId)) {
    res.status(403).json({ error: "Forbidden." });
    return;
  }
  next();
}
