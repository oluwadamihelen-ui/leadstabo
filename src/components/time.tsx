"use client";
import { formatDateTime, timeAgo } from "@/lib/utils";

// Relative / local times differ between server render and the browser (clock, timezone),
// so these render client-side values without hydration warnings.
export function TimeAgo({ date }: { date: string | Date }) {
  return (
    <time dateTime={new Date(date).toISOString()} suppressHydrationWarning>
      {timeAgo(date)}
    </time>
  );
}

export function LocalDateTime({ date }: { date: string | Date }) {
  return (
    <time dateTime={new Date(date).toISOString()} suppressHydrationWarning>
      {formatDateTime(date)}
    </time>
  );
}
