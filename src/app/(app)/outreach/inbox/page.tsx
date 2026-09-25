import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { emailProvider } from "@/lib/providers";
import { OutreachNav } from "@/components/section-nav";
import { InboxView, type ThreadItem } from "./inbox-view";

export const metadata: Metadata = { title: "Inbox" };

const FOLDERS: Record<string, Prisma.ConversationWhereInput> = {
  all: { archived: false },
  unread: { archived: false, unread: true },
  replied: { archived: false, replied: true },
  interested: { archived: false, label: "INTERESTED" },
  meeting: { archived: false, label: "MEETING" },
  not_interested: { archived: false, label: "NOT_INTERESTED" },
  bounced: { label: "BOUNCED" },
  archived: { archived: true },
};

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ folder?: string; c?: string; q?: string }> }) {
  const ctx = await requireWorkspace();
  const sp = await searchParams;
  const folder = sp.folder && sp.folder in FOLDERS ? sp.folder : "all";
  const base: Prisma.ConversationWhereInput = { workspaceId: ctx.workspaceId };
  const where: Prisma.ConversationWhereInput = { ...base, ...FOLDERS[folder] };
  if (folder !== "bounced" && folder !== "archived") where.NOT = { label: "BOUNCED" };
  if (sp.q) {
    const ci = { contains: sp.q.slice(0, 80), mode: "insensitive" as const };
    where.OR = [{ subject: ci }, { lead: { OR: [{ firstName: ci }, { lastName: ci }, { email: ci }] } }];
  }

  const [conversations, counts] = await Promise.all([
    db.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: { lead: { include: { company: true } }, campaign: { select: { id: true, name: true } }, replies: { orderBy: { receivedAt: "desc" }, take: 1 } },
    }),
    Promise.all(
      Object.entries(FOLDERS).map(async ([k, w]) => [k, await db.conversation.count({ where: { ...base, ...w, ...(k !== "bounced" && k !== "archived" ? { NOT: { label: "BOUNCED" } } : {}) } })] as const),
    ),
  ]);

  const selectedId = sp.c ?? null;
  let selected = null;
  if (selectedId) {
    const c = await db.conversation.findFirst({
      where: { id: selectedId, workspaceId: ctx.workspaceId },
      include: {
        lead: { include: { company: true, notes: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 5 } } },
        campaign: { select: { id: true, name: true } },
        inbox: { select: { email: true, displayName: true } },
        emails: { orderBy: { sentAt: "asc" } },
        replies: { orderBy: { receivedAt: "asc" } },
      },
    });
    if (c) {
      if (c.unread) await db.conversation.update({ where: { id: c.id }, data: { unread: false } });
      const thread: ThreadItem[] = [
        ...c.emails.map((e) => ({ id: e.id, direction: "out" as const, from: c.inbox?.displayName ?? "You", body: e.body, subject: e.subject, at: (e.sentAt ?? e.createdAt).toISOString(), status: e.status })),
        ...c.replies.map((r) => ({ id: r.id, direction: "in" as const, from: `${c.lead.firstName} ${c.lead.lastName}`, body: r.body, subject: c.subject, at: r.receivedAt.toISOString(), category: r.category, confidence: r.aiConfidence })),
      ].sort((a, b) => a.at.localeCompare(b.at));
      const lastReply = c.replies[c.replies.length - 1];
      selected = {
        id: c.id,
        subject: c.subject,
        label: c.label,
        archived: c.archived,
        meetingAt: c.meetingAt?.toISOString() ?? null,
        lead: {
          id: c.lead.id,
          name: `${c.lead.firstName} ${c.lead.lastName}`,
          email: c.lead.email,
          title: c.lead.title,
          company: c.lead.company?.name ?? null,
          location: c.lead.location,
          notes: c.lead.notes.map((n) => ({ id: n.id, body: n.body, author: n.author.name, at: n.createdAt.toISOString() })),
        },
        campaign: c.campaign,
        inbox: c.inbox?.email ?? null,
        thread,
        suggestion: lastReply?.suggestedResponse ?? null,
      };
    }
  }

  const campaigns = await db.campaign.findMany({ where: { workspaceId: ctx.workspaceId, status: { not: "COMPLETED" } }, select: { id: true, name: true, status: true } });

  return (
    <>
      <OutreachNav active="/outreach/inbox" />
      <InboxView
        folder={folder}
        counts={Object.fromEntries(counts)}
        conversations={conversations.map((c) => ({
          id: c.id,
          name: `${c.lead.firstName} ${c.lead.lastName}`,
          company: c.lead.company?.name ?? null,
          subject: c.subject,
          snippet: c.replies[0]?.body ?? "",
          campaign: c.campaign?.name ?? null,
          label: c.label,
          unread: c.unread,
          replied: c.replied,
          at: c.lastMessageAt.toISOString(),
        }))}
        selected={selected}
        campaigns={campaigns}
        canEdit={ctx.role !== "VIEWER"}
        mockMode={emailProvider().name === "mock"}
      />
    </>
  );
}
