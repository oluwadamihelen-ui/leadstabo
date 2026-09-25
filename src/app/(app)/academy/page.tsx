import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/guard";
import { coursesWithProgress } from "@/lib/queries/academy";
import { AcademyNav } from "@/components/section-nav";
import { CourseCard, ProgressRing } from "@/components/academy/course-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Academy" };

export default async function AcademyPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const ctx = await requireWorkspace();
  const { kind } = await searchParams;
  const { courses } = await coursesWithProgress(ctx.user.id);
  const inProgress = courses.filter((c) => c.completed > 0 && c.pct < 100);
  const shown = courses.filter((c) => !kind || c.kind === kind.toUpperCase());

  return (
    <>
      <AcademyNav active="/academy" />
      <section className="max-w-3xl">
        <h1 className="text-[28px] font-semibold tracking-tight">Continue learning</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off, or explore what’s next.</p>
        <div className="mt-6 space-y-3">
          {(inProgress.length ? inProgress : courses.slice(0, 1)).map((c) => (
            <Link key={c.id} href={c.next ? `/academy/learn/${c.next.slug}` : `/academy/courses/${c.slug}`} className="group flex items-center gap-5 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/20">
              <ProgressRing pct={c.pct} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold group-hover:text-primary">{c.title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {c.nextModule?.dayLabel} of {c.modules.length} · Next: {c.next?.title}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <div className="my-10 h-px bg-border" />

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Browse everything</h2>
          <div className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-[13px]">
            {[
              ["", "All"],
              ["course", "Courses"],
              ["challenge", "Challenges"],
            ].map(([k, l]) => (
              <Link key={k} href={k ? `?kind=${k}` : "/academy"} className={cn("rounded-md px-3 py-1.5 font-medium", (kind ?? "") === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {l}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <CourseCard
              key={c.id}
              slug={c.slug}
              title={c.title}
              description={c.description}
              accent={c.accent}
              badge={c.badge}
              pct={c.pct}
              lessonCount={c.lessonCount}
              completed={c.completed}
              priceLabel={c.priceLabel}
              nextLabel={c.nextModule ? `${c.nextModule.dayLabel} of ${c.modules.length}` : undefined}
            />
          ))}
        </div>
      </section>
    </>
  );
}
