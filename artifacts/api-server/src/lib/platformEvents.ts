import { db, platformEventsTable } from "@workspace/db";
import { logger } from "./logger";

export type PlatformEventType =
  | "estimate.created"
  | "listing.created"
  | "vision.extracted";

export async function recordPlatformEvent(args: {
  userId: string | null;
  eventType: PlatformEventType;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(platformEventsTable).values({
      userId: args.userId,
      eventType: args.eventType,
      payload: args.payload,
    });
  } catch (err) {
    logger.warn({ err, eventType: args.eventType }, "recordPlatformEvent failed (non-fatal)");
  }
}
