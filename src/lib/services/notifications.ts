import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

export async function notify(
  workspaceId: string,
  n: { type: NotificationType; title: string; body: string; href?: string; userId?: string },
) {
  return db.notification.create({ data: { workspaceId, ...n } });
}
