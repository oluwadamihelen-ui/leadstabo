import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/permissions";
import { readOutreachSettings } from "@/lib/outreach-settings";
import { OutreachSettingsForm } from "./outreach-form";

export const metadata: Metadata = { title: "Outreach settings" };

export default async function OutreachSettingsPage() {
  const ctx = await requireWorkspace();
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: ctx.workspaceId } });
  return <OutreachSettingsForm initial={readOutreachSettings(ws.outreachSettings)} canEdit={hasRole(ctx.role, "ADMIN")} />;
}
