"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertOctagon,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarCheck,
  Inbox as InboxIcon,
  Mail,
  MailOpen,
  MessageSquareReply,
  Rocket,
  Search,
  Send,
  Sparkles,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/status";
import { AddToCampaignDialog } from "@/components/leads/leads-table";
import { useAction } from "@/components/hooks/use-action";
import { archiveConversation, bookMeeting, sendReply, setConversationLabel, setConversationRead, simulateInboundReply } from "@/server/actions/inbox";
import { addLeadNote } from "@/server/actions/leads";
import { addLeadsToCampaign } from "@/server/actions/campaigns";
import { aiAssist } from "@/server/actions/ai";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

export interface ThreadItem {
  id: string;
  direction: "in" | "out";
  from: string;
  subject: string;
  body: string;
  at: string;
  status?: string;
  category?: string;
  confidence?: number;
}

interface ConversationRow {
  id: string;
  name: string;
  company: string | null;
  subject: string;
  snippet: string;
  campaign: string | null;
  label: string;
  unread: boolean;
  replied: boolean;
  at: string;
}

interface Selected {
  id: string;
  subject: string;
  label: string;
  archived: boolean;
  meetingAt: string | null;
  lead: { id: string; name: string; email: string; title: string | null; company: string | null; location: string | null; notes: { id: string; body: string; author: string; at: string }[] };
  campaign: { id: string; name: string } | null;
  inbox: string | null;
  thread: ThreadItem[];
  suggestion: string | null;
}

const FOLDER_LIST = [
  { key: "all", label: "All", icon: InboxIcon },
  { key: "unread", label: "Unread", icon: Mail },
  { key: "replied", label: "Replied", icon: MessageSquareReply },
  { key: "interested", label: "Interested", icon: ThumbsUp },
  { key: "meeting", label: "Meeting", icon: CalendarCheck },
  { key: "not_interested", label: "Not interested", icon: ThumbsDown },
  { key: "bounced", label: "Bounced", icon: AlertOctagon },
  { key: "archived", label: "Archived", icon: Archive },
];

export function InboxView({
  folder,
  counts,
  conversations,
  selected,
  campaigns,
  canEdit,
  mockMode,
}: {
  folder: string;
  counts: Record<string, number>;
  conversations: ConversationRow[];
  selected: Selected | null;
  campaigns: { id: string; name: string; status: string }[];
  canEdit: boolean;
  mockMode: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const href = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) (v ? sp.set(k, v) : sp.delete(k));
    return `${pathname}?${sp}`;
  };

  // j/k keyboard navigation between conversations.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      const idx = conversations.findIndex((c) => c.id === selected?.id);
      if (e.key === "j" && conversations[idx + 1]) router.push(href({ c: conversations[idx + 1].id }));
      if (e.key === "k" && idx > 0) router.push(href({ c: conversations[idx - 1].id }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="grid h-[calc(100vh-11rem)] min-h-[560px] overflow-hidden rounded-xl border bg-card lg:grid-cols-[200px_340px_1fr]">
      {/* Folders */}
      <nav className="hidden flex-col gap-0.5 border-r p-2 lg:flex">
        <p className="label-caps px-2 pb-2 pt-1">Inbox</p>
        {FOLDER_LIST.map((f) => (
          <Link
            key={f.key}
            href={`${pathname}?folder=${f.key}`}
            className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground", folder === f.key && "bg-accent font-medium text-foreground")}
          >
            <f.icon className="size-4" />
            <span className="flex-1">{f.label}</span>
            <span className="text-[11px] tabular-nums">{counts[f.key] ?? 0}</span>
          </Link>
        ))}
        <p className="mt-auto px-2 pb-1 text-[10px] text-muted-foreground">Tip: press j / k to move between threads</p>
      </nav>

      {/* List */}
      <div className={cn("flex min-h-0 flex-col border-r", selected && "hidden lg:flex")}>
        <div className="space-y-2 border-b p-2">
          <div className="flex gap-1 overflow-x-auto lg:hidden">
            {FOLDER_LIST.map((f) => (
              <Link key={f.key} href={`${pathname}?folder=${f.key}`} className={cn("whitespace-nowrap rounded-md border px-2 py-1 text-xs", folder === f.key ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground")}>
                {f.label} {counts[f.key] ?? 0}
              </Link>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(href({ q: q.trim() || null, c: null }));
            }}
            className="relative"
          >
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" className="pl-8" />
          </form>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {conversations.length === 0 ? (
            <EmptyState icon={InboxIcon} title="Nothing here" description="Replies will show up here the moment prospects respond." />
          ) : (
            conversations.map((c) => (
              <Link
                key={c.id}
                href={href({ c: c.id })}
                className={cn("block border-b px-3 py-3 transition-colors hover:bg-muted/40", selected?.id === c.id && "bg-primary/[0.06]", c.unread && "bg-muted/20")}
              >
                <div className="flex items-center gap-2">
                  {c.unread && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <p className={cn("flex-1 truncate text-[13px]", c.unread ? "font-semibold" : "font-medium")}>{c.name}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.at)}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.company}</p>
                <p className="mt-1 truncate text-xs">{c.subject}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.snippet}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {c.label !== "NONE" && <StatusBadge status={c.label} />}
                  {c.replied && <Badge>Replied</Badge>}
                  {c.campaign && <Badge className="max-w-[160px] truncate">{c.campaign}</Badge>}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={cn("min-h-0", !selected && "hidden lg:block")}>
        {selected ? (
          <Conversation key={selected.id} c={selected} campaigns={campaigns} canEdit={canEdit} mockMode={mockMode} back={href({ c: null })} />
        ) : (
          <EmptyState icon={MailOpen} title="Select a conversation" description="Pick a thread to read it and reply." className="h-full" />
        )}
      </div>
    </div>
  );
}

function Conversation({ c, campaigns, canEdit, mockMode, back }: { c: Selected; campaigns: { id: string; name: string; status: string }[]; canEdit: boolean; mockMode: boolean; back: string }) {
  const { exec, pending } = useAction();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [meeting, setMeeting] = useState(false);
  const [when, setWhen] = useState("");
  const [camp, setCamp] = useState(false);
  const [sim, setSim] = useState(false);
  const [simText, setSimText] = useState("Sounds interesting — can you send a few times for a call next week?");
  const [drafting, setDrafting] = useState(false);
  const lastIn = [...c.thread].reverse().find((t) => t.direction === "in");

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={back} className="mt-1 rounded p-1 text-muted-foreground hover:bg-accent lg:hidden" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
          <Avatar name={c.lead.name} className="size-10" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.subject}</p>
            <p className="truncate text-xs text-muted-foreground">
              <Link href={`/leads/${c.lead.id}`} className="text-foreground hover:text-primary">
                {c.lead.name}
              </Link>{" "}
              · {c.lead.title} · {c.lead.company}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {c.label !== "NONE" && <StatusBadge status={c.label} />}
              {c.campaign && (
                <Link href={`/outreach/campaigns/${c.campaign.id}`}>
                  <Badge tone="info">{c.campaign.name}</Badge>
                </Link>
              )}
              {c.meetingAt && (
                <Badge tone="primary">
                  <CalendarCheck className="size-3" /> {formatDateTime(c.meetingAt)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-1">
            <Tooltip content="Mark interested">
              <Button size="icon-sm" variant={c.label === "INTERESTED" ? "subtle" : "ghost"} onClick={() => exec(() => setConversationLabel(c.id, c.label === "INTERESTED" ? "NONE" : "INTERESTED"))}>
                <ThumbsUp />
              </Button>
            </Tooltip>
            <Tooltip content="Mark not interested">
              <Button size="icon-sm" variant={c.label === "NOT_INTERESTED" ? "subtle" : "ghost"} onClick={() => exec(() => setConversationLabel(c.id, c.label === "NOT_INTERESTED" ? "NONE" : "NOT_INTERESTED"))}>
                <ThumbsDown />
              </Button>
            </Tooltip>
            <Tooltip content="Book meeting">
              <Button size="icon-sm" variant="ghost" onClick={() => setMeeting(true)}>
                <CalendarCheck />
              </Button>
            </Tooltip>
            <Tooltip content="Add note">
              <Button size="icon-sm" variant="ghost" onClick={() => setShowNote(!showNote)}>
                <StickyNote />
              </Button>
            </Tooltip>
            <Tooltip content="Add to campaign">
              <Button size="icon-sm" variant="ghost" onClick={() => setCamp(true)}>
                <Rocket />
              </Button>
            </Tooltip>
            <Tooltip content="Mark unread">
              <Button size="icon-sm" variant="ghost" onClick={() => exec(() => setConversationRead(c.id, false))}>
                <Mail />
              </Button>
            </Tooltip>
            <Tooltip content={c.archived ? "Unarchive" : "Archive"}>
              <Button size="icon-sm" variant="ghost" onClick={() => exec(() => archiveConversation(c.id, !c.archived))}>
                {c.archived ? <ArchiveRestore /> : <Archive />}
              </Button>
            </Tooltip>
            {mockMode && (
              <Tooltip content="Simulate an inbound reply (mock mode)">
                <Button size="icon-sm" variant="ghost" onClick={() => setSim(true)}>
                  <Zap />
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        {showNote && canEdit && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <Textarea rows={2} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note on this lead…" />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                loading={pending}
                disabled={!note.trim()}
                onClick={async () => {
                  if (await exec(() => addLeadNote(c.lead.id, note))) {
                    setNote("");
                    setShowNote(false);
                  }
                }}
              >
                Save note
              </Button>
            </div>
          </div>
        )}
        {c.lead.notes.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="label-caps mb-1.5 flex items-center gap-1.5">
              <StickyNote className="size-3" /> Notes
            </p>
            {c.lead.notes.map((n) => (
              <p key={n.id} className="text-xs">
                <span className="text-muted-foreground">{n.author}:</span> {n.body}
              </p>
            ))}
          </div>
        )}
        {c.thread.map((t) => (
          <div key={t.id} className={cn("max-w-[92%] rounded-xl border p-4", t.direction === "out" ? "ml-auto bg-muted/40" : "bg-background")}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              {t.direction === "in" ? <UserRound className="size-3.5 text-primary" /> : <Send className="size-3.5 text-muted-foreground" />}
              <span className="font-medium">{t.from}</span>
              <span className="text-muted-foreground">{formatDateTime(t.at)}</span>
              {t.status === "BOUNCED" && <StatusBadge status="BOUNCED" />}
              {t.category && (
                <span className="ml-auto flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" />
                  <StatusBadge status={t.category} />
                  <span className="text-[10px] text-muted-foreground">{Math.round((t.confidence ?? 0) * 100)}%</span>
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-6">{t.body}</p>
          </div>
        ))}
      </div>

      {canEdit && c.label !== "BOUNCED" && (
        <div className="border-t p-3">
          {c.suggestion && !reply && (
            <button onClick={() => setReply(c.suggestion!)} className="mb-2 flex w-full items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-left text-xs hover:bg-primary/10">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-primary">AI suggested reply</span> — click to use
                <span className="mt-0.5 line-clamp-2 block text-muted-foreground">{c.suggestion}</span>
              </span>
            </button>
          )}
          <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${c.lead.name.split(" ")[0]}…`} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">From {c.inbox ?? "your inbox"}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="subtle"
                loading={drafting}
                onClick={async () => {
                  setDrafting(true);
                  const r = await aiAssist("suggest_response", {
                    lead: { firstName: c.lead.name.split(" ")[0], company: c.lead.company, title: c.lead.title },
                    reply: lastIn?.body ?? "",
                  });
                  setDrafting(false);
                  if (r.ok && r.data?.text) setReply(r.data.text);
                }}
              >
                <Sparkles /> Draft with AI
              </Button>
              <Button
                size="sm"
                loading={pending}
                disabled={!reply.trim()}
                onClick={async () => {
                  if (await exec(() => sendReply(c.id, reply))) setReply("");
                }}
              >
                <Send /> Send reply
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={meeting} onOpenChange={setMeeting}>
        <DialogContent title="Book a meeting" description={`Schedule a call with ${c.lead.name}. The conversation is labelled “Meeting”.`} size="sm">
          <Field label="Date & time">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMeeting(false)}>
              Cancel
            </Button>
            <Button
              disabled={!when}
              loading={pending}
              onClick={async () => {
                if (await exec(() => bookMeeting(c.id, new Date(when).toISOString()))) setMeeting(false);
              }}
            >
              Book meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sim} onOpenChange={setSim}>
        <DialogContent title="Simulate inbound reply" description="Mock mode only — runs the real classification and notification pipeline." size="sm">
          <Textarea rows={4} value={simText} onChange={(e) => setSimText(e.target.value)} />
          <DialogFooter>
            <Button
              loading={pending}
              onClick={async () => {
                if (await exec(() => simulateInboundReply(c.id, simText))) setSim(false);
              }}
            >
              Receive reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {camp && <AddToCampaignDialog campaigns={campaigns} count={1} onClose={() => setCamp(false)} onSubmit={(campaignId) => exec(() => addLeadsToCampaign({ campaignId, leadIds: [c.lead.id] }))} />}
    </div>
  );
}
