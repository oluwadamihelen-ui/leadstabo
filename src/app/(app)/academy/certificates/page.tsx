import type { Metadata } from "next";
import Link from "next/link";
import { Award, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { coursesWithProgress } from "@/lib/queries/academy";
import { AcademyNav } from "@/components/section-nav";
import { LogoMark } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { PageHeader, Progress } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const ctx = await requireWorkspace();
  const [certs, { courses }] = await Promise.all([
    db.certificate.findMany({ where: { userId: ctx.user.id }, include: { course: true }, orderBy: { issuedAt: "desc" } }),
    coursesWithProgress(ctx.user.id),
  ]);
  const earned = new Set(certs.map((c) => c.courseId));
  return (
    <>
      <AcademyNav active="/academy/certificates" />
      <PageHeader title="Certificates" description="Complete every lesson in a course to earn its certificate." />
      {certs.length > 0 && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {certs.map((c) => (
            <div key={c.id} className="print-cert relative overflow-hidden rounded-2xl border bg-[#07080b] p-8 text-white">
              <div className="absolute inset-3 rounded-xl border border-white/10" />
              <div className="absolute left-8 top-8 h-20 w-[3px] bg-gradient-to-b from-[#f4782a] to-transparent" />
              <div className="relative pl-6">
                <div className="flex items-center gap-2">
                  <LogoMark className="size-6" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Leadstabo Academy</span>
                </div>
                <p className="mt-8 text-[11px] uppercase tracking-[0.25em] text-[#f4782a]">Certificate of completion</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{ctx.user.name}</p>
                <p className="mt-2 text-sm text-white/60">has successfully completed</p>
                <p className="mt-1 text-lg font-medium">{c.course.title}</p>
                <div className="mt-8 flex items-end justify-between text-xs text-white/50">
                  <span>Issued {formatDate(c.issuedAt)}</span>
                  <span className="font-mono">{c.code}</span>
                </div>
              </div>
              <div className="relative mt-4 flex justify-end">
                <PrintButton />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses
          .filter((c) => !earned.has(c.id))
          .map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/40">
                  <Lock className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.lessonCount - c.completed} lessons to go</p>
                </div>
              </div>
              <Progress value={c.pct} tone="info" className="mt-4" />
              <Link href={c.next ? `/academy/learn/${c.next.slug}` : `/academy/courses/${c.slug}`} className="mt-3 inline-flex items-center gap-1 text-[13px] text-primary hover:underline">
                <Award className="size-4" /> {c.completed ? "Continue to earn" : "Start course"}
              </Link>
            </Card>
          ))}
      </div>
    </>
  );
}
