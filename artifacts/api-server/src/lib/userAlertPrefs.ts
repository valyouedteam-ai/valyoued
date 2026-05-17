import { eq } from "drizzle-orm";
import { db, userAlertPrefsTable } from "@workspace/db";

export type AlertPrefsState = {
  estimateReadyEmail: boolean;
  productUpdatesEmail: boolean;
};

export async function getUserAlertPrefs(userId: string): Promise<AlertPrefsState> {
  const [row] = await db
    .select()
    .from(userAlertPrefsTable)
    .where(eq(userAlertPrefsTable.userId, userId));
  return {
    estimateReadyEmail: row?.estimateReadyEmail ?? false,
    productUpdatesEmail: row?.productUpdatesEmail ?? false,
  };
}

export async function upsertUserAlertPrefs(
  userId: string,
  patch: Partial<AlertPrefsState>,
): Promise<AlertPrefsState> {
  const current = await getUserAlertPrefs(userId);
  const next: AlertPrefsState = { ...current, ...patch };
  await db
    .insert(userAlertPrefsTable)
    .values({
      userId,
      estimateReadyEmail: next.estimateReadyEmail,
      productUpdatesEmail: next.productUpdatesEmail,
    })
    .onConflictDoUpdate({
      target: userAlertPrefsTable.userId,
      set: {
        estimateReadyEmail: next.estimateReadyEmail,
        productUpdatesEmail: next.productUpdatesEmail,
        updatedAt: new Date(),
      },
    });
  return next;
}
