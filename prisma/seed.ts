import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PLAN_CATALOG } from "../src/config/plans";
import { ACADEMY_COURSES } from "../src/config/academy";
import { seedDemoWorkspace } from "../src/lib/demo/seed-workspace";

const db = new PrismaClient();
const DAY = 86400_000;

async function seedPlans() {
  for (const p of PLAN_CATALOG) {
    await db.plan.upsert({ where: { key: p.key }, create: p, update: p });
  }
}

async function seedAcademy() {
  for (const [ci, c] of ACADEMY_COURSES.entries()) {
    const { modules, ...course } = c;
    const row = await db.academyCourse.upsert({
      where: { slug: c.slug },
      create: { ...course, sortOrder: ci },
      update: { ...course, sortOrder: ci },
    });
    await db.academyModule.deleteMany({ where: { courseId: row.id } });
    for (const [mi, m] of modules.entries()) {
      await db.academyModule.create({
        data: {
          courseId: row.id,
          order: mi,
          dayLabel: m.dayLabel,
          title: m.title,
          description: m.description,
          lessons: {
            create: m.lessons.map((l, li) => ({
              slug: l.slug,
              order: li,
              title: l.title,
              durationMin: l.durationMin,
              summary: l.summary,
              content: l.content,
              keyPoints: l.keyPoints,
              resources: l.resources ?? [],
            })),
          },
        },
      });
    }
  }
}

async function upsertUser(email: string, name: string, company: string) {
  return db.user.upsert({
    where: { email },
    create: { email, name, company, timezone: "Africa/Lagos", passwordHash: await bcrypt.hash("leadabo123", 12) },
    update: {},
  });
}

async function main() {
  console.log("Seeding plans…");
  await seedPlans();
  console.log("Seeding academy…");
  await seedAcademy();

  // "leadstabo-demo" is the slug used before the rename to Leadabo.
  const oldDemo = await db.workspace.findUnique({ where: { slug: "leadstabo-demo" } });
  if (oldDemo) await db.workspace.delete({ where: { id: oldDemo.id } });
  await db.user.deleteMany({ where: { email: { in: ["demo@leadstabo.com", "sarah@leadstabo.com", "tunde@leadstabo.com"] } } });
  const existing = await db.workspace.findUnique({ where: { slug: "leadabo-demo" } });
  if (existing) {
    console.log("Demo workspace exists — removing and re-creating.");
    await db.workspace.delete({ where: { id: existing.id } });
  }
  const other = await db.workspace.findUnique({ where: { slug: "acme-isolated" } });
  if (other) await db.workspace.delete({ where: { id: other.id } });

  const owner = await upsertUser("demo@leadabo.com", "Nicholas Lawrence Onumara", "Leadabo Demo");
  const admin = await upsertUser("sarah@leadabo.com", "Sarah Chen", "Leadabo Demo");
  const member = await upsertUser("tunde@leadabo.com", "Tunde Balogun", "Leadabo Demo");
  const outsider = await upsertUser("owner@acme.test", "Acme Owner", "Acme");

  const growth = await db.plan.findUniqueOrThrow({ where: { key: "growth" } });
  const starter = await db.plan.findUniqueOrThrow({ where: { key: "starter" } });
  const now = new Date();
  const ws = await db.workspace.create({
    data: {
      name: "Onumara Growth",
      slug: "leadabo-demo",
      createdAt: new Date(Date.now() - 40 * DAY),
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: admin.id, role: "ADMIN" },
          { userId: member.id, role: "MEMBER" },
        ],
      },
      subscription: {
        create: {
          planId: growth.id,
          interval: "MONTHLY",
          status: "ACTIVE",
          currentPeriodStart: new Date(now.getTime() - 34 * DAY),
          currentPeriodEnd: new Date(now.getTime() + 26 * DAY),
          providerRef: "sub_mock_demo",
        },
      },
    },
  });
  await db.user.updateMany({ where: { id: { in: [owner.id, admin.id, member.id] } }, data: { lastWorkspaceId: ws.id } });

  // A second workspace the demo user can't see — demonstrates tenant isolation.
  const acme = await db.workspace.create({
    data: {
      name: "Acme (isolated)",
      slug: "acme-isolated",
      members: { create: [{ userId: outsider.id, role: "OWNER" }] },
      subscription: { create: { planId: starter.id, currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 30 * DAY) } },
      creditBalance: { create: { balance: 500, monthlyCredits: 500, lifetimeCredits: 500 } },
    },
  });
  await db.user.update({ where: { id: outsider.id }, data: { lastWorkspaceId: acme.id } });

  console.log("Seeding demo workspace data…");
  await seedDemoWorkspace(db, ws.id, owner.id);

  await db.teamInvitation.create({
    data: {
      workspaceId: ws.id,
      email: "amara@partner.agency",
      role: "MEMBER",
      tokenHash: createHash("sha256").update(randomBytes(32).toString("base64url")).digest("hex"),
      invitedById: owner.id,
      expiresAt: new Date(now.getTime() + 6 * DAY),
    },
  });
  const rawKey = `lsk_live_${randomBytes(24).toString("base64url")}`;
  await db.apiKey.create({
    data: {
      workspaceId: ws.id,
      name: "Zapier integration",
      prefix: rawKey.slice(0, 13),
      keyHash: createHash("sha256").update(rawKey).digest("hex"),
      createdById: owner.id,
      lastUsedAt: new Date(now.getTime() - 3 * 3600_000),
      createdAt: new Date(now.getTime() - 18 * DAY),
    },
  });

  // Academy: Day 1–3 complete, first lesson of Day 4 complete (≈57%).
  const course = await db.academyCourse.findUniqueOrThrow({
    where: { slug: "outbound-acquisition" },
    include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
  });
  await db.lessonProgress.deleteMany({ where: { userId: owner.id } });
  const done = course.modules.slice(0, 3).flatMap((m) => m.lessons).concat(course.modules[3].lessons.slice(0, 3));
  await db.lessonProgress.createMany({
    data: done.map((l, i) => ({
      userId: owner.id,
      lessonId: l.id,
      completedAt: new Date(now.getTime() - (8 - Math.floor(i / 3)) * DAY),
      notes: i === 6 ? "ICP: proprietors of 200–800 student private schools in Lagos & Abuja. Pain = fee collection." : null,
    })),
  });

  console.log("\n✔ Seed complete");
  console.log("  Demo login:  demo@leadabo.com / leadabo123 (owner)");
  console.log("  Also:        sarah@leadabo.com (admin), tunde@leadabo.com (member) — same password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
