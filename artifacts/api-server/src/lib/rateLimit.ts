import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const SWEEP_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
}, SWEEP_MS).unref?.();

interface Options {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  message?: string;
}

export function rateLimit({ windowMs, max, key, message }: Options) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = key
      ? key(req)
      : (req.ip || req.socket.remoteAddress || "anon") + ":" + req.path;
    const now = Date.now();
    const bucket = buckets.get(id);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error:
          message ||
          `You're going a bit fast: please wait ${retryAfter}s and try again.`,
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
