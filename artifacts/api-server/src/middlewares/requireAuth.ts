import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { authStubUserId, isAuthStubMode } from "../lib/authStub";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthStubMode()) {
    (req as AuthedRequest).userId = authStubUserId();
    next();
    return;
  }
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "You need to sign in to do that." });
    return;
  }
  (req as AuthedRequest).userId = userId;
  next();
}

export function getUserId(req: Request): string | null {
  if (isAuthStubMode()) {
    return authStubUserId();
  }
  const auth = getAuth(req);
  return auth?.userId ?? null;
}
