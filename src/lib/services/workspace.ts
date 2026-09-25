import "server-only";
import { db } from "@/lib/db";
import { addDays, slugify } from "@/lib/utils";
import { randomToken } from "@/lib/crypto";

/** Creates a workspace on the Starter plan with its monthly credit grant. */
export async function createWorkspaceFor(userId: string, name: string) {
  const plan = (await db.plan.findUnique({ where: { key: "starter" } })) ?? (await db.plan.findFirst({ orderBy: { sortOrder: "asc" } }));
  const now = new Date();
  const ws = await db.workspace.create({
    data: {
      name,
      slug: `${slugify(name) || "workspace"}-${randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      members: { create: { userId, role: "OWNER" } },
      ...(plan
        ? {
            subscription: {
              create: { planId: plan.id, interval: "MONTHLY", status: "TRIALING", currentPeriodStart: now, currentPeriodEnd: addDays(now, 30) },
            },
          }
        : {}),
      creditBalance: { create: { balance: plan?.leadCredits ?? 500, monthlyCredits: plan?.leadCredits ?? 500, lifetimeCredits: plan?.leadCredits ?? 500 } },
      creditTxns: {
        create: {
          amount: plan?.leadCredits ?? 500,
          category: "PLAN_GRANT",
          description: `${plan?.name ?? "Starter"} plan monthly credits`,
          balanceAfter: plan?.leadCredits ?? 500,
        },
      },
    },
  });
  await db.user.update({ where: { id: userId }, data: { lastWorkspaceId: ws.id } });
  return ws;
}
