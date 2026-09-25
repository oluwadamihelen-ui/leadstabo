"use client";
import Link from "next/link";
import { Check, Copy, MessageSquareReply, Tags } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useAction } from "@/components/hooks/use-action";
import { markReplyHandled, reclassifyReply } from "@/server/actions/inbox";
import { titleCase } from "@/lib/utils";

const CATS = ["POSITIVE", "INTERESTED", "MEETING_REQUEST", "QUESTION", "NEGATIVE", "OUT_OF_OFFICE"] as const;

export function ReplyActions({ id, conversationId, suggestion, category, handled, canEdit }: { id: string; conversationId: string; suggestion: string | null; category: string; handled: boolean; canEdit: boolean }) {
  const { exec } = useAction();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <Button size="xs" asChild>
        <Link href={`/outreach/inbox?c=${conversationId}`}>
          <MessageSquareReply /> Reply
        </Link>
      </Button>
      {suggestion && (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(suggestion);
            toast.success("Suggested response copied");
          }}
        >
          <Copy /> Copy
        </Button>
      )}
      {canEdit && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="secondary">
                <Tags /> Reclassify
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Correct the AI label</DropdownMenuLabel>
              {CATS.map((c) => (
                <DropdownMenuItem key={c} onSelect={() => exec(() => reclassifyReply(id, c))}>
                  {c === category && <Check />} {titleCase(c).replace("Request", "requested")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="xs" variant="ghost" onClick={() => exec(() => markReplyHandled(id, !handled))}>
            <Check /> {handled ? "Reopen" : "Mark handled"}
          </Button>
        </>
      )}
    </div>
  );
}
