import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock, PlayCircle } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/guard";
import { coursesWithProgress } from "@/lib/queries/academy";
import { AcademyNav } from "@/components/section-nav";
import { CourseCover, ProgressRing } from "@/components/academy/course-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Course" };

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await requireWorkspace();
  const { slug } = await params;
  const { courses, done } = await coursesWithProgress(ctx.user.id);
  const c = courses.find((x) => x.slug === slug);
  if (!c) notFound();

  return (
    <>
      <AcademyNav active="/academy" />
      <Link href="/academy" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Academy
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="label-caps text-primary">{c.kind === "CHALLENGE" ? "Challenge" : "Course"}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{c.title}</h1>
          <p className="mt-1 text-lg text-muted-foreground">{c.subtitle}</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-foreground/85">{c.description}</p>
          <div className="mt-8 space-y-4">
            {c.modules.map((m) => {
              const mDone = m.lessons.filter((l) => done.has(l.id)).length;
              return (
                <Card key={m.id} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-4 border-b p-5">
                    <div>
                      <p className="label-caps text-info">{m.dayLabel}</p>
                      <p className="mt-1 text-[15px] font-semibold">{m.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{m.description}</p>
                    </div>
                    <span className={cn("shrink-0 text-xs", mDone === m.lessons.length ? "text-success" : "text-muted-foreground")}>
                      {mDone}/{m.lessons.length}
                    </span>
                  </div>
                  <div className="divide-y">
                    {m.lessons.map((l) => (
                      <Link key={l.id} href={`/academy/learn/${l.slug}`} className="flex items-center gap-3 px-5 py-3 text-[13px] hover:bg-muted/30">
                        {done.has(l.id) ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                        <span className="flex-1">{l.title}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" /> {l.durationMin} min
                        </span>
                      </Link>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <CourseCover title={c.title} accent={c.accent} badge={c.badge} enrolled={c.completed > 0} />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <ProgressRing pct={c.pct} size={56} />
                <div className="text-[13px]">
                  <p className="font-medium">
                    {c.completed} of {c.lessonCount} lessons
                  </p>
                  <p className="text-muted-foreground">
                    {c.modules.length} modules · {Math.round(c.minutes / 6) / 10} hrs
                  </p>
                </div>
              </div>
              {c.next && (
                <Button asChild className="w-full" size="lg">
                  <Link href={`/academy/learn/${c.next.slug}`}>
                    <PlayCircle /> {c.completed === 0 ? "Start course" : c.pct === 100 ? "Review course" : "Continue"}
                  </Link>
                </Button>
              )}
              {c.next && c.pct < 100 && <p className="text-center text-xs text-muted-foreground">Up next: {c.next.title}</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
