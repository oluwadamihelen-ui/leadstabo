"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { assertWorkspace } from "@/lib/auth/guard";
import { randomToken } from "@/lib/crypto";
import { notify } from "@/lib/services/notifications";
import { id } from "@/lib/validation";
import { run, UserError } from "../action";

export async function setLessonComplete(lessonId: string, complete: boolean) {
  return run(async () => {
    const ctx = await assertWorkspace("VIEWER");
    const lesson = await db.academyLesson.findUnique({
      where: { id: id.parse(lessonId) },
      include: { module: { include: { lessons: { select: { id: true } }, course: { include: { modules: { include: { lessons: { select: { id: true } } } } } } } } },
    });
    if (!lesson) throw new UserError("Lesson not found");
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: ctx.user.id, lessonId: lesson.id } },
      create: { userId: ctx.user.id, lessonId: lesson.id, completedAt: complete ? new Date() : null },
      update: { completedAt: complete ? new Date() : null },
    });
    if (!complete) return { ok: true as const, message: "Marked incomplete" };

    const done = new Set(
      (await db.lessonProgress.findMany({ where: { userId: ctx.user.id, completedAt: { not: null } }, select: { lessonId: true } })).map((p) => p.lessonId),
    );
    const course = lesson.module.course;
    let message = "Lesson complete";
    if (lesson.module.lessons.every((l) => done.has(l.id))) {
      message = `${lesson.module.dayLabel} complete 🎉`;
      await notify(ctx.workspaceId, {
        userId: ctx.user.id,
        type: "ACADEMY_MILESTONE",
        title: `${lesson.module.dayLabel} complete`,
        body: `You finished “${lesson.module.title}” in ${course.title}.`,
        href: `/academy/courses/${course.slug}`,
      });
    }
    if (course.modules.every((m) => m.lessons.every((l) => done.has(l.id)))) {
      const existing = await db.certificate.findUnique({ where: { userId_courseId: { userId: ctx.user.id, courseId: course.id } } });
      if (!existing) {
        await db.certificate.create({ data: { userId: ctx.user.id, courseId: course.id, code: `LS-${randomToken(6).toUpperCase().replace(/[^A-Z0-9]/g, "X")}` } });
        await notify(ctx.workspaceId, {
          userId: ctx.user.id,
          type: "ACADEMY_MILESTONE",
          title: "Certificate earned 🏆",
          body: `You completed ${course.title}. Your certificate is ready.`,
          href: "/academy/certificates",
        });
        message = "Course complete — certificate earned!";
      }
    }
    return { ok: true as const, message };
  });
}

export async function saveLessonNotes(lessonId: string, notes: string) {
  return run(async () => {
    const ctx = await assertWorkspace("VIEWER");
    const n = z.string().max(20_000).parse(notes);
    const lid = id.parse(lessonId);
    if (!(await db.academyLesson.findUnique({ where: { id: lid }, select: { id: true } }))) throw new UserError("Lesson not found");
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: ctx.user.id, lessonId: lid } },
      create: { userId: ctx.user.id, lessonId: lid, notes: n },
      update: { notes: n },
    });
    return { ok: true as const };
  });
}
