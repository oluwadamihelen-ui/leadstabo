import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, ExternalLink, PlayCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { Markdown } from "@/components/academy/markdown";
import { SlidePlayer } from "@/components/academy/slide-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { CompleteButton, LessonNotes } from "./lesson-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const l = await db.academyLesson.findUnique({ where: { slug }, select: { title: true } });
  return { title: l?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await requireWorkspace();
  const { slug } = await params;
  const lesson = await db.academyLesson.findUnique({
    where: { slug },
    include: { module: { include: { course: { include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } } } } } },
  });
  if (!lesson) notFound();
  const course = lesson.module.course;
  const all = course.modules.flatMap((m) => m.lessons);
  const idx = all.findIndex((l) => l.id === lesson.id);
  const prev = all[idx - 1];
  const next = all[idx + 1];
  const progress = await db.lessonProgress.findMany({ where: { userId: ctx.user.id, lessonId: { in: all.map((l) => l.id) } } });
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  const mine = progress.find((p) => p.lessonId === lesson.id);
  const pct = Math.round((done.size / all.length) * 100);
  const resources = (Array.isArray(lesson.resources) ? lesson.resources : []) as { label: string; href: string }[];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/academy/courses/${course.slug}`} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {course.title}
        </Link>
        <div className="flex w-full items-center gap-3 sm:w-72">
          <Progress value={pct} tone="info" className="h-2" />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{pct}% complete</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr_300px]">
        {/* Course navigation */}
        <aside className="order-3 xl:order-1">
          <Card className="overflow-hidden xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto scrollbar-thin">
            {course.modules.map((m) => (
              <div key={m.id} className="border-b last:border-0">
                <div className="px-4 pb-1.5 pt-3">
                  <p className="label-caps text-info">{m.dayLabel}</p>
                  <p className="text-[13px] font-semibold leading-snug">{m.title}</p>
                </div>
                <div className="pb-2">
                  {m.lessons.map((l) => (
                    <Link
                      key={l.id}
                      href={`/academy/learn/${l.slug}`}
                      className={cn("flex items-center gap-2.5 px-4 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/40 hover:text-foreground", l.id === lesson.id && "bg-primary/[0.08] font-medium text-foreground")}
                    >
                      {done.has(l.id) ? <CheckCircle2 className="size-3.5 shrink-0 text-success" /> : l.id === lesson.id ? <PlayCircle className="size-3.5 shrink-0 text-primary" /> : <Circle className="size-3.5 shrink-0" />}
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="text-[10px]">{l.durationMin}m</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </aside>

        {/* Player + content */}
        <main className="order-1 min-w-0 xl:order-2">
          <SlidePlayer dayLabel={lesson.module.dayLabel} title={lesson.title} summary={lesson.summary} keyPoints={lesson.keyPoints} videoUrl={lesson.videoUrl} durationMin={lesson.durationMin} />
          <div className="mt-6">
            <p className="label-caps text-primary">
              {lesson.module.dayLabel} · Lesson {lesson.order + 1} of {course.modules.find((m) => m.id === lesson.moduleId)?.lessons.length}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1>
            <p className="mt-2 text-muted-foreground">{lesson.summary}</p>
          </div>
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <Markdown source={lesson.content} />
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            {prev ? (
              <Button asChild variant="secondary">
                <Link href={`/academy/learn/${prev.slug}`}>
                  <ChevronLeft /> <span className="hidden sm:inline">{prev.title}</span>
                  <span className="sm:hidden">Previous</span>
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {next && (
              <Button asChild variant="secondary">
                <Link href={`/academy/learn/${next.slug}`}>
                  <span className="hidden sm:inline">{next.title}</span>
                  <span className="sm:hidden">Next</span> <ChevronRight />
                </Link>
              </Button>
            )}
          </div>
        </main>

        {/* Sidebar */}
        <aside className="order-2 space-y-4 xl:order-3">
          <Card className="p-4">
            <CompleteButton lessonId={lesson.id} complete={done.has(lesson.id)} nextHref={next ? `/academy/learn/${next.slug}` : `/academy/courses/${course.slug}`} />
            {next && (
              <Link href={`/academy/learn/${next.slug}`} className="mt-3 block rounded-lg border bg-muted/30 p-3 hover:bg-muted/50">
                <p className="label-caps">Next lesson</p>
                <p className="mt-0.5 text-[13px] font-medium">{next.title}</p>
              </Link>
            )}
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Key takeaways</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-[13px]">
                {lesson.keyPoints.map((k) => (
                  <li key={k} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {k}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {resources.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {resources.map((r) => (
                  <Link key={r.href} href={r.href} className="flex items-center justify-between rounded-md border px-3 py-2 text-[13px] hover:bg-muted/40">
                    {r.label} <ExternalLink className="size-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          <LessonNotes lessonId={lesson.id} initial={mine?.notes ?? ""} />
        </aside>
      </div>
    </>
  );
}
