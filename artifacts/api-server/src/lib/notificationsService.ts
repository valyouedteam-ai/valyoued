import { and, desc, eq, inArray } from "drizzle-orm";
import { db, userNotificationsTable } from "@workspace/db";
import type { UserNotification } from "@workspace/api-zod";

export async function listUserNotifications(userId: string): Promise<UserNotification[]> {
  const rows = await db
    .select()
    .from(userNotificationsTable)
    .where(eq(userNotificationsTable.userId, userId))
    .orderBy(desc(userNotificationsTable.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as UserNotification["kind"],
    title: r.title,
    body: r.body,
    estimateId: r.estimateId,
    href: r.href,
    createdAt: r.createdAt,
    read: r.read,
  }));
}

export async function createUserNotification(
  userId: string,
  n: Omit<UserNotification, "id" | "createdAt" | "read">,
): Promise<void> {
  await db.insert(userNotificationsTable).values({
    userId,
    kind: n.kind,
    title: n.title,
    body: n.body,
    estimateId: n.estimateId ?? null,
    href: n.href ?? null,
    read: false,
  });
}

export async function markNotificationsRead(
  userId: string,
  opts: { markAllRead?: boolean; ids?: string[] },
): Promise<number> {
  if (opts.markAllRead) {
    const updated = await db
      .update(userNotificationsTable)
      .set({ read: true })
      .where(and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.read, false)))
      .returning();
    return updated.length;
  }
  if (opts.ids?.length) {
    const updated = await db
      .update(userNotificationsTable)
      .set({ read: true })
      .where(
        and(eq(userNotificationsTable.userId, userId), inArray(userNotificationsTable.id, opts.ids)),
      )
      .returning();
    return updated.length;
  }
  return 0;
}
