import { Lock } from "lucide-react";
import { StatusBadge } from "@/components/status";

export function EmailCell({ email, status }: { email: string; status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Lock className="size-3" />
        {email}
      </span>
    );
  }
  return <span className="font-mono text-xs">{email}</span>;
}

export function EmailStatusCell({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">Hidden</span>;
  return <StatusBadge status={status} />;
}
