import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Serverless Postgres (e.g. Neon) suspends when idle and takes a few seconds to wake up.
// Connection failures ("can't reach database server", closed connections) are retried with
// backoff so the first request after a quiet period doesn't crash the page.
const RETRYABLE = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const RETRIES = 3;

function isConnectionError(e: unknown) {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError) return RETRYABLE.has(e.code);
  return e instanceof Prisma.PrismaClientUnknownRequestError && /connection|Closed|ECONNRESET|terminat/i.test(e.message);
}

function createClient() {
  const base = new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            if (attempt >= RETRIES || !isConnectionError(e)) throw e;
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); // 1s, 2s, 4s
          }
        }
      },
    },
  }) as unknown as PrismaClient;
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
