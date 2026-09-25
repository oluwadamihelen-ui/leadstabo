import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Clock, Flame } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/guard";
import { coursesWithProgress } from "@/lib/queries/academy";
import { AcademyNav } from "@/components/section-nav";
import { ProgressRing } from "@/components/academy/course-card";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Academy progress" };

export default async function ProgressPage() {
  const ctx = await requireWorkspace();
  const { courses, progress } = await coursesWithProgress(ctx.user.id);
  const lessonIndex = new Map(courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => [l.id, { l, m, c }] as const))));
  const completed = progress.filter((p) => p.completedAt).sort((a, b) => +b.completedAt! - +a.completedAt!);
  const minutes = completed.reduce((a, p) => a + (lessonIndex.get(p.lessonId)?.l.durationMin ?? 0), 0);
  const days = new Set(completed.map((p) => p.completedAt!.toISOString().slice(0, 10)));
  let streak = 0;
  for (let d = new Date(); days.has(d.toISOString().slice(0, 10)) || (streak === 0 && days.has(new Date(d.getTime() - 86400_000).toISOString().slice(0, 10))); d = new Date(d.getTime() - 86400_000)) {
    if (days.has(d.toISOString().slice(0, 10))) streak++;
    if (streak > 365) break;
  }

  return (
    <>
      <AcademyNav active="/academy/progress" />
      <PageHeader title="Your progress" description="Track every lesson, day and course you’ve completed." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lessons completed" value={completed.length} icon={CheckCircle2} />
        <StatCard label="Time learned" value={`${Math.round(minutes / 6) / 10}h`} icon={Clock} />
        <StatCard label="Learning days" value={days.size} icon={Flame} hint={streak ? `${streak}-day streak` : "Start a streak today"} />
        <StatCard label="Courses finished" value={courses.filter((c) => c.pct === 100).length} icon={Award} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {courses.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center gap-4">
                <ProgressRing pct={c.pct} />
                <div className="min-w-0 flex-1">
                  <Link href={`/academy/courses/${c.slug}`} className="font-semibold hover:text-primary">
                    {c.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {c.completed}/{c.lessonCount} lessons
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {c.modules.map((m) => {
                  const d = m.lessons.filter((l) => progress.some((p) => p.lessonId === l.id && p.completedAt)).length;
                  return (
                    <div key={m.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="truncate">
                          <span className="text-info">{m.dayLabel}</span> · {m.title}
                        </span>
                        <span className="text-muted-foreground">
                          {d}/{m.lessons.length}
                        </span>
                      </div>
                      <Progress value={(d / m.lessons.length) * 100} tone={d === m.lessons.length ? "success" : "info"} />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {completed.length === 0 ? (
              <EmptyState icon={BookOpen} title="No lessons completed yet" className="py-8" />
            ) : (
              <ol className="relative space-y-4 border-l pl-4">
                {completed.slice(0, 12).map((p) => {
                  const x = lessonIndex.get(p.lessonId);
                  return (
                    <li key={p.id} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-success" />
                      <Link href={`/academy/learn/${x?.l.slug}`} className="text-[13px] hover:text-primary">
                        {x?.l.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {x?.m.dayLabel} · {formatDateTime(p.completedAt)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
