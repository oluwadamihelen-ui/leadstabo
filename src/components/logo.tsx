import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-foreground/[0.06]" />
      <path d="M9 7h4v14h10v4H9z" fill="hsl(var(--primary))" />
      <circle cx="22.5" cy="10.5" r="3.5" fill="hsl(var(--primary))" opacity=".55" />
    </svg>
  );
}

export function Logo({ className, plan }: { className?: string; plan?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[0.14em]">LEADSTABO</span>
      {plan && (
        <span className="rounded border px-1.5 py-px text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {plan}
        </span>
      )}
    </span>
  );
}
