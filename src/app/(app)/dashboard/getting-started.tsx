"use client";
import Link from "next/link";
import { CheckCircle2, Circle, Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAction } from "@/components/hooks/use-action";
import { loadSampleData } from "@/server/actions/workspace";
import { cn } from "@/lib/utils";

export function GettingStarted({ hasIcp, hasDomain, hasInbox }: { hasIcp: boolean; hasDomain: boolean; hasInbox: boolean }) {
  const { exec, pending } = useAction();
  const steps = [
    { label: "Define your ICP & offer", href: "/outreach/playbook", done: hasIcp },
    { label: "Add a sending domain", href: "/settings/infrastructure/domains", done: hasDomain },
    { label: "Connect an inbox & start warmup", href: "/settings/infrastructure/inboxes", done: hasInbox },
    { label: "Find & verify leads", href: "/leadgen/find", done: false },
    { label: "Launch your first campaign", href: "/outreach/campaigns/new", done: false },
  ];
  return (
    <Card className="relative mb-6 overflow-hidden p-5">
      <div className="absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Sparkles className="size-4 text-primary" /> Get your outbound engine running
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Follow the steps, or load sample data to explore a fully populated workspace.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {steps.map((s, i) => (
              <Link key={s.label} href={s.href} className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2 text-[13px] hover:bg-accent">
                {s.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                <span className={cn(s.done && "text-muted-foreground line-through")}>
                  {i + 1}. {s.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
        <Button variant="secondary" loading={pending} onClick={() => exec(() => loadSampleData(), { success: "Sample data loaded" })}>
          <Database /> Load sample data
        </Button>
      </div>
    </Card>
  );
}
