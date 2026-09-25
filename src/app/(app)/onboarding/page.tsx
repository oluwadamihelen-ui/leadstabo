import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Globe, Rocket } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/guard";
import { Card } from "@/components/ui/card";
import { SampleDataCard } from "./sample-data";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const ctx = await requireWorkspace();
  const first = ctx.user.name.split(" ")[0];
  const paths = [
    { icon: BookOpen, title: "Take the 7-day Academy", body: "Learn the full outbound system, one day at a time.", href: "/academy" },
    { icon: Globe, title: "Set up infrastructure", body: "Add a sending domain and connect your first inbox.", href: "/settings/infrastructure/domains" },
    { icon: Rocket, title: "Go to the dashboard", body: "Follow the getting-started checklist.", href: "/dashboard" },
  ];
  return (
    <div className="mx-auto max-w-3xl py-8 text-center">
      <p className="label-caps text-primary">Welcome to Leadabo</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Let’s build your outbound engine, {first}.</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Your workspace “{ctx.workspace.name}” is ready with 500 lead credits. Choose where to start.</p>
      <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
        {paths.map((p) => (
          <Link key={p.title} href={p.href} className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
            <p.icon className="size-5 text-primary" />
            <p className="mt-3 font-medium group-hover:text-primary">{p.title}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{p.body}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6 p-5 text-left">
        <SampleDataCard />
      </Card>
    </div>
  );
}
