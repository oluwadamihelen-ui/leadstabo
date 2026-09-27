import "server-only";
import type { CreditCategory, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { notify } from "./notifications";

export const CREDIT_COSTS = {
  LEAD_REVEAL: 1,
  VERIFICATION: 1,
  AI_GENERATION: 2,
  EMAIL_SEND: 0,
} as const;

const LOW_CREDIT_THRESHOLD = 250;

/** Atomically deducts credits; throws a user-facing error when the balance is insufficient. */
export async function spendCredits(
  workspaceId: string,
  amount: number,
  category: CreditCategory,
  description: string,
  tx: Prisma.TransactionClient = db,
) {
  if (amount <= 0) return null;
  // A plain updateMany + separate read is two round trips: under concurrent spends, a second
  // call's decrement can land between this call's decrement and its read, so the read (and the
  // balanceAfter recorded on the ledger) would reflect both spends, not just this one. A single
  // UPDATE ... RETURNING makes the decrement and the resulting balance one atomic step.
  const rows = await tx.$queryRaw<{ balance: number }[]>`
    UPDATE "CreditBalance" SET balance = balance - ${amount} WHERE "workspaceId" = ${workspaceId} AND balance >= ${amount} RETURNING balance
  `;
  if (rows.length === 0) throw new UserError(`Not enough credits — this needs ${amount}. Top up in Billing.`);
  const newBalance = rows[0].balance;
  await tx.creditTransaction.create({
    data: { workspaceId, amount: -amount, category, description, balanceAfter: newBalance },
  });
  if (newBalance < LOW_CREDIT_THRESHOLD && newBalance + amount >= LOW_CREDIT_THRESHOLD) {
    await notify(workspaceId, {
      type: "LOW_CREDITS",
      title: "Credits running low",
      body: `Only ${newBalance} credits left. Top up to keep finding and verifying leads.`,
      href: "/settings/billing",
    });
  }
  return newBalance;
}

export async function addCredits(workspaceId: string, amount: number, category: CreditCategory, description: string, externalRef?: string) {
  const bal = await db.creditBalance.upsert({
    where: { workspaceId },
    create: { workspaceId, balance: amount, lifetimeCredits: amount },
    update: { balance: { increment: amount }, lifetimeCredits: { increment: amount } },
  });
  await db.creditTransaction.create({
    data: { workspaceId, amount, category, description, balanceAfter: bal.balance, externalRef },
  });
  return bal.balance;
}
