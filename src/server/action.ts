import "server-only";
import { ZodError } from "zod";
import { AuthError, UserError } from "@/lib/errors";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

/** Wraps a server action body so callers always receive a serialisable result. */
export async function run<T>(fn: () => Promise<T | ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const out = await fn();
    if (out && typeof out === "object" && "ok" in (out as object)) return out as ActionResult<T>;
    return { ok: true, data: out as T };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof UserError) return { ok: false, error: e.message };
    // Next.js redirect/notFound are thrown as errors and must propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export { UserError };
