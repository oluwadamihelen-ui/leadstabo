"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

type Result<T> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

/**
 * Runs a server action, surfaces its outcome as a toast and refreshes server data.
 * Returns the action's data on success, undefined on failure.
 */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const exec = useCallback(
    async <T,>(fn: () => Promise<Result<T>>, opts: { success?: string; refresh?: boolean } = {}) => {
      setBusy(true);
      try {
        const res = await fn();
        if (!res.ok) {
          toast.error(res.error);
          return undefined;
        }
        const msg = res.message ?? opts.success;
        if (msg) toast.success(msg);
        if (opts.refresh !== false) startTransition(() => router.refresh());
        return (res.data ?? true) as T;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return { exec, pending: pending || busy };
}
