import type { Metadata } from "next";
import { requireWorkspace } from "@/lib/auth/guard";
import { ProfileForm, WorkspaceForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const ctx = await requireWorkspace();
  return (
    <div className="space-y-6">
      <ProfileForm user={{ name: ctx.user.name, email: ctx.user.email, company: ctx.user.company ?? "", timezone: ctx.user.timezone, avatarUrl: ctx.user.avatarUrl ?? "" }} />
      <WorkspaceForm name={ctx.workspace.name} canEdit={ctx.role === "OWNER" || ctx.role === "ADMIN"} />
    </div>
  );
}
