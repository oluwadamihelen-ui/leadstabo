import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  className,
  invertDelta,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  delta?: number;
  invertDelta?: boolean;
  className?: string;
}) {
  const good = delta !== undefined && (invertDelta ? delta <= 0 : delta >= 0);
  return (
    <div className={cn("group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors hover:border-foreground/15", className)}>
      <div className="flex items-start justify-between">
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/50">
            <Icon className="size-4 text-muted-foreground" />
          </span>
        )}
        {delta !== undefined && (
          <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium", good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
            {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="label-caps mt-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
