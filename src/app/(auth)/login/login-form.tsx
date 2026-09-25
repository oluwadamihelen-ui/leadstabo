"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { login } from "@/server/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [needs2fa, setNeeds2fa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", code: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await login({ ...form, code: needs2fa ? form.code : undefined });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    if (res.data?.needs2fa) return setNeeds2fa(true);
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : (res.data?.redirect ?? "/dashboard"));
    router.refresh();
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your outbound engine.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {!needs2fa ? (
          <>
            <Field label="Work email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </Field>
          </>
        ) : (
          <Field label="Authentication code" hint="Enter the 6-digit code from your authenticator app." htmlFor="code">
            <Input id="code" inputMode="numeric" autoFocus maxLength={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="123456" className="font-mono tracking-[0.4em]" />
          </Field>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {needs2fa ? "Verify & sign in" : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        Demo account: <span className="font-mono text-foreground">demo@leadstabo.com</span> /{" "}
        <span className="font-mono text-foreground">leadstabo123</span>
        <button
          type="button"
          className="ml-2 text-primary hover:underline"
          onClick={() => setForm({ ...form, email: "demo@leadstabo.com", password: "leadstabo123" })}
        >
          Fill in
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Leadstabo?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
