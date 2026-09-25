import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/guard";
import { coursesWithProgress } from "@/lib/queries/academy";
import { AcademyNav } from "@/components/section-nav";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Lessons" };

export default async function LessonsPage() {
  const ctx = await requireWorkspace();
  const { courses, done } = await coursesWithProgress(ctx.user.id);
  const total = courses.reduce((a, c) => a + c.lessonCount, 0);
  return (
    <>
      <AcademyNav active="/academy/lessons" />
      <PageHeader title="All lessons" description={`${total} lessons across ${courses.length} courses — ${done.size} completed.`} />
      <div className="space-y-6">
        {courses.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <Link href={`/academy/courses/${c.slug}`} className="font-semibold hover:text-primary">
                {c.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {c.completed}/{c.lessonCount}
              </span>
            </div>
            <div className="divide-y">
              {c.modules.flatMap((m) =>
                m.lessons.map((l) => (
                  <Link key={l.id} href={`/academy/learn/${l.slug}`} className="grid grid-cols-[20px_90px_1fr_auto] items-center gap-3 px-5 py-2.5 text-[13px] hover:bg-muted/30">
                    {done.has(l.id) ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                    <span className="label-caps text-info">{m.dayLabel}</span>
                    <span className="truncate">{l.title}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {l.durationMin}m
                    </span>
                  </Link>
                )),
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
