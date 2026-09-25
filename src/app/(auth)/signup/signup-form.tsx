"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signup } from "@/server/actions/auth";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invite = params.get("invite") ?? undefined;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: params.get("email") ?? "", company: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signup({ ...form, invite });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    router.push(res.data?.redirect ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight">{invite ? "Join your team" : "Start building"}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {invite ? "Create your account to accept the invitation." : "Create your workspace. Starter plan includes 500 lead credits."}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" htmlFor="name">
            <Input id="name" required autoComplete="name" value={form.name} onChange={set("name")} placeholder="Ada Lovelace" />
          </Field>
          <Field label="Company" htmlFor="company">
            <Input id="company" required autoComplete="organization" value={form.company} onChange={set("company")} placeholder="Acme Inc." />
          </Field>
        </div>
        <Field label="Work email" htmlFor="email">
          <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@company.com" />
        </Field>
        <Field label="Password" hint="At least 8 characters with a letter and a number." htmlFor="password">
          <Input id="password" type="password" required autoComplete="new-password" value={form.password} onChange={set("password")} placeholder="••••••••" />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
