"use client";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/hooks/use-action";
import { verifyLeads } from "@/server/actions/leads";

export function VerifyListButton({ listId, unverified }: { listId: string; unverified: number }) {
  const { exec, pending } = useAction();
  return (
    <Button disabled={!unverified} loading={pending} onClick={() => exec(() => verifyLeads({ listId, onlyUnverified: true }))}>
      <MailCheck /> Verify {unverified} unverified · {unverified} cr
    </Button>
  );
}
