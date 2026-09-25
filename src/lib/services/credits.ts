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

export const CREDIT_PACKS = [
  { credits: 1_000, priceMinor: 1_900 },
  { credits: 5_000, priceMinor: 7_900 },
  { credits: 20_000, priceMinor: 24_900 },
  { credits: 100_000, priceMinor: 99_900 },
];

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
  const updated = await tx.creditBalance.updateMany({
    where: { workspaceId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (updated.count === 0) throw new UserError(`Not enough credits — this needs ${amount}. Top up in Billing.`);
  const bal = await tx.creditBalance.findUniqueOrThrow({ where: { workspaceId } });
  await tx.creditTransaction.create({
    data: { workspaceId, amount: -amount, category, description, balanceAfter: bal.balance },
  });
  if (bal.balance < LOW_CREDIT_THRESHOLD && bal.balance + amount >= LOW_CREDIT_THRESHOLD) {
    await notify(workspaceId, {
      type: "LOW_CREDITS",
      title: "Credits running low",
      body: `Only ${bal.balance} credits left. Top up to keep finding and verifying leads.`,
      href: "/settings/billing",
    });
  }
  return bal.balance;
}

export async function addCredits(workspaceId: string, amount: number, category: CreditCategory, description: string) {
  const bal = await db.creditBalance.upsert({
    where: { workspaceId },
    create: { workspaceId, balance: amount, lifetimeCredits: amount },
    update: { balance: { increment: amount }, lifetimeCredits: { increment: amount } },
  });
  await db.creditTransaction.create({
    data: { workspaceId, amount, category, description, balanceAfter: bal.balance },
  });
  return bal.balance;
}
