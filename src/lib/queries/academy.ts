import "server-only";
import { db } from "@/lib/db";

export async function coursesWithProgress(userId: string) {
  const [courses, progress] = await Promise.all([
    db.academyCourse.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
    }),
    db.lessonProgress.findMany({ where: { userId } }),
  ]);
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  return {
    done,
    progress,
    courses: courses.map((c) => {
      const lessons = c.modules.flatMap((m) => m.lessons);
      const completed = lessons.filter((l) => done.has(l.id)).length;
      const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
      const nextModule = c.modules.find((m) => m.lessons.some((l) => l.id === next?.id));
      return {
        ...c,
        lessonCount: lessons.length,
        completed,
        pct: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
        minutes: lessons.reduce((a, l) => a + l.durationMin, 0),
        next,
        nextModule,
      };
    }),
  };
}
