import * as React from "react";
import Link from "next/link";
import { cn, initials } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function Progress({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "success" | "warning" | "danger" | "info" }) {
  const color = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-destructive", info: "bg-info" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const AVATAR_TONES = [
  "bg-orange-500/15 text-orange-400",
  "bg-sky-500/15 text-sky-400",
  "bg-violet-500/15 text-violet-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-pink-500/15 text-pink-400",
  "bg-amber-500/15 text-amber-400",
];

export function Avatar({ name, className, src }: { name: string; className?: string; src?: string | null }) {
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn("size-8 shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", tone, className)}>
      {initials(name) || "?"}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-muted/50">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      )}
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="label-caps mb-2 text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SubNav({ items, active }: { items: { href: string; label: string; badge?: string }[]; active: string }) {
  return (
    <div className="-mx-4 mb-6 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <nav className="flex gap-1">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap px-3 pb-2.5 pt-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              active === i.href && "text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary",
            )}
          >
            {i.label}
            {i.badge && <span className="rounded bg-primary/15 px-1 text-[9px] font-semibold uppercase text-primary">{i.badge}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground", className)}>{children}</kbd>;
}
