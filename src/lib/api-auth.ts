import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

/** Authenticates `Authorization: Bearer lsk_…` and returns the key's workspace. */
export async function apiAuth(req: NextRequest): Promise<{ workspaceId: string } | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("lsk_")) return apiError(401, "Missing or malformed API key");
  const key = await db.apiKey.findUnique({ where: { keyHash: sha256(token) } });
  if (!key || key.revokedAt) return apiError(401, "Invalid API key");
  const rl = rateLimit(`api:${key.id}`, 120, 60_000);
  if (!rl.ok) return apiError(429, "Rate limit exceeded (120 requests/minute)");
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
    await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  }
  return { workspaceId: key.workspaceId };
}

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: { status, message } }, { status });
}
