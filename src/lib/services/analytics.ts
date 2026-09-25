import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, startOfDay } from "@/lib/utils";

export interface Funnel {
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  replied: number;
  positive: number;
  meetings: number;
}

const EMPTY: Funnel = { sent: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, replied: 0, positive: 0, meetings: 0 };
const POSITIVE = ["POSITIVE", "INTERESTED", "MEETING_REQUEST"] as const;

type Row = { key: string | null; type: string; n: bigint };

/** Unique-email event counts grouped by an optional dimension (campaign / inbox). */
async function eventCounts(workspaceId: string, by: "campaign" | "inbox" | null, since?: Date) {
  const dim = by === "campaign" ? Prisma.sql`"campaignId"` : by === "inbox" ? Prisma.sql`"inboxId"` : Prisma.sql`NULL`;
  const rows = await db.$queryRaw<Row[]>`
    SELECT ${dim}::text AS key, type::text AS type, COUNT(DISTINCT "emailId") AS n
    FROM "EmailEvent"
    WHERE "workspaceId" = ${workspaceId} ${since ? Prisma.sql`AND "occurredAt" >= ${since}` : Prisma.empty}
    GROUP BY 1, 2`;
  const out = new Map<string, Funnel>();
  for (const r of rows) {
    const k = r.key ?? "_";
    const f = out.get(k) ?? { ...EMPTY };
    const n = Number(r.n);
    switch (r.type) {
      case "SENT": f.sent = n; break;
      case "DELIVERED": f.delivered = n; break;
      case "BOUNCED": f.bounced = n; break;
      case "OPENED": f.opened = n; break;
      case "CLICKED": f.clicked = n; break;
      case "REPLIED": f.replied = n; break;
    }
    out.set(k, f);
  }
  return out;
}

export async function workspaceFunnel(workspaceId: string, since?: Date): Promise<Funnel> {
  const [counts, positive, meetings] = await Promise.all([
    eventCounts(workspaceId, null, since),
    db.reply.count({ where: { workspaceId, category: { in: [...POSITIVE] }, ...(since ? { receivedAt: { gte: since } } : {}) } }),
    db.conversation.count({ where: { workspaceId, label: "MEETING", ...(since ? { lastMessageAt: { gte: since } } : {}) } }),
  ]);
  return { ...(counts.get("_") ?? EMPTY), positive, meetings };
}

export async function campaignFunnels(workspaceId: string) {
  const [counts, positives, meetings] = await Promise.all([
    eventCounts(workspaceId, "campaign"),
    db.reply.groupBy({ by: ["campaignId"], where: { workspaceId, category: { in: [...POSITIVE] } }, _count: true }),
    db.conversation.groupBy({ by: ["campaignId"], where: { workspaceId, label: "MEETING" }, _count: true }),
  ]);
  for (const p of positives) if (p.campaignId) counts.set(p.campaignId, { ...(counts.get(p.campaignId) ?? EMPTY), positive: p._count });
  for (const m of meetings) if (m.campaignId) counts.set(m.campaignId, { ...(counts.get(m.campaignId) ?? EMPTY), meetings: m._count });
  return (id: string) => counts.get(id) ?? { ...EMPTY };
}

export async function inboxFunnels(workspaceId: string) {
  const counts = await eventCounts(workspaceId, "inbox");
  return (id: string) => counts.get(id) ?? { ...EMPTY };
}

export interface DailyPoint {
  date: string;
  label: string;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

export async function dailySeries(workspaceId: string, days = 30, campaignId?: string): Promise<DailyPoint[]> {
  const since = startOfDay(addDays(new Date(), -(days - 1)));
  const rows = await db.$queryRaw<{ d: Date; type: string; n: bigint }[]>`
    SELECT date_trunc('day', "occurredAt") AS d, type::text AS type, COUNT(*) AS n
    FROM "EmailEvent"
    WHERE "workspaceId" = ${workspaceId} AND "occurredAt" >= ${since}
      ${campaignId ? Prisma.sql`AND "campaignId" = ${campaignId}` : Prisma.empty}
    GROUP BY 1, 2`;
  const byDay = new Map<string, DailyPoint>();
  for (let i = 0; i < days; i++) {
    const d = addDays(since, i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, {
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sent: 0,
      opened: 0,
      replied: 0,
      bounced: 0,
    });
  }
  for (const r of rows) {
    const p = byDay.get(new Date(r.d).toISOString().slice(0, 10));
    if (!p) continue;
    const n = Number(r.n);
    if (r.type === "SENT") p.sent += n;
    else if (r.type === "OPENED") p.opened += n;
    else if (r.type === "REPLIED") p.replied += n;
    else if (r.type === "BOUNCED") p.bounced += n;
  }
  return Array.from(byDay.values());
}

export function rate(n: number, d: number) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

/** Percent change between the last `days` and the `days` before that. */
export async function trend(workspaceId: string, days = 7) {
  const now = new Date();
  const cur = await workspaceFunnel(workspaceId, addDays(now, -days));
  const prevAll = await workspaceFunnel(workspaceId, addDays(now, -days * 2));
  const prev: Funnel = {
    sent: prevAll.sent - cur.sent,
    delivered: prevAll.delivered - cur.delivered,
    bounced: prevAll.bounced - cur.bounced,
    opened: prevAll.opened - cur.opened,
    clicked: prevAll.clicked - cur.clicked,
    replied: prevAll.replied - cur.replied,
    positive: prevAll.positive - cur.positive,
    meetings: prevAll.meetings - cur.meetings,
  };
  const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);
  return {
    sent: delta(cur.sent, prev.sent),
    replied: delta(cur.replied, prev.replied),
    opened: delta(cur.opened, prev.opened),
    positive: delta(cur.positive, prev.positive),
  };
}
