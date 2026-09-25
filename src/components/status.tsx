import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "violet";

const TONES: Record<string, Tone> = {
  // campaign
  DRAFT: "neutral",
  PREPARING: "info",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "violet",
  // email verification
  UNVERIFIED: "neutral",
  VALID: "success",
  INVALID: "danger",
  RISKY: "warning",
  UNKNOWN: "neutral",
  CATCH_ALL: "info",
  // domains / dns
  PENDING: "neutral",
  VERIFYING: "info",
  ISSUE: "danger",
  // inbox
  CONNECTED: "success",
  DISCONNECTED: "danger",
  ERROR: "danger",
  // warmup
  NOT_STARTED: "neutral",
  // reply categories
  POSITIVE: "success",
  NEGATIVE: "danger",
  QUESTION: "info",
  OUT_OF_OFFICE: "neutral",
  INTERESTED: "success",
  MEETING_REQUEST: "primary",
  UNCLASSIFIED: "neutral",
  // conversation labels
  MEETING: "primary",
  NOT_INTERESTED: "danger",
  BOUNCED: "danger",
  NONE: "neutral",
  // campaign lead
  QUEUED: "neutral",
  IN_SEQUENCE: "info",
  REPLIED: "success",
  UNSUBSCRIBED: "warning",
};

const LABELS: Record<string, string> = {
  CATCH_ALL: "Catch-all",
  MEETING_REQUEST: "Meeting requested",
  OUT_OF_OFFICE: "Out of office",
  IN_SEQUENCE: "In sequence",
  NOT_INTERESTED: "Not interested",
  NOT_STARTED: "Not started",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={TONES[status] ?? "neutral"} dot className={className}>
      {LABELS[status] ?? titleCase(status)}
    </Badge>
  );
}

export function HealthScore({ score }: { score: number }) {
  const tone = score >= 85 ? "text-success" : score >= 60 ? "text-warning" : score > 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium tabular-nums ${tone}`}>
      <span className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-current opacity-30" />
        <span className="relative m-auto size-1.5 rounded-full bg-current" />
      </span>
      {score > 0 ? score : "—"}
    </span>
  );
}
