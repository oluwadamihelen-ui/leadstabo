import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENTS: Record<string, { ring: string; glow: string; badge: string; bar: string }> = {
  orange: { ring: "border-primary/40 bg-primary/15 text-primary", glow: "from-primary/25", badge: "border-primary/30 bg-primary/15 text-primary", bar: "bg-primary" },
  blue: { ring: "border-info/40 bg-info/15 text-info", glow: "from-info/25", badge: "border-info/30 bg-info/15 text-info", bar: "bg-info" },
  violet: { ring: "border-violet/40 bg-violet/15 text-violet", glow: "from-violet/25", badge: "border-violet/30 bg-violet/15 text-violet", bar: "bg-violet" },
};

export function accentFor(a: string) {
  return ACCENTS[a] ?? ACCENTS.orange;
}

export function CourseCover({ title, accent, badge, enrolled, className }: { title: string; accent: string; badge?: string | null; enrolled?: boolean; className?: string }) {
  const a = accentFor(accent);
  return (
    <div className={cn("relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[#0b0c10]", className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent", a.glow)} />
      <div className="absolute inset-x-6 bottom-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute left-6 top-1/2 h-16 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
      <p className="absolute bottom-9 left-6 right-6 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{title}</p>
      {badge && <span className={cn("absolute left-3 top-3 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", a.badge)}>{badge}</span>}
      {enrolled && <span className="absolute right-3 top-3 rounded border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">Enrolled</span>}
      <span className={cn("flex size-12 items-center justify-center rounded-xl border backdrop-blur", a.ring)}>
        <Play className="size-5 fill-current" />
      </span>
    </div>
  );
}

export function CourseCard({
  slug,
  title,
  description,
  accent,
  badge,
  pct,
  lessonCount,
  completed,
  priceLabel,
  nextLabel,
}: {
  slug: string;
  title: string;
  description: string;
  accent: string;
  badge?: string | null;
  pct: number;
  lessonCount: number;
  completed: number;
  priceLabel?: string | null;
  nextLabel?: string;
}) {
  const a = accentFor(accent);
  return (
    <Link href={`/academy/courses/${slug}`} className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/20">
      <CourseCover title={title} accent={accent} badge={badge} enrolled={completed > 0} />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[15px] font-semibold leading-snug group-hover:text-primary">{title}</p>
        <p className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{description}</p>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{completed > 0 ? nextLabel ?? `${completed}/${lessonCount} lessons` : priceLabel ?? `${lessonCount} lessons`}</span>
            <span className={cn("font-medium", completed ? "text-info" : "text-muted-foreground")}>{completed > 0 ? (pct === 100 ? "Completed" : "Continue") : "Start"}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", a.bar)} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProgressRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--info))" strokeWidth={5} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{pct}%</span>
    </div>
  );
}
