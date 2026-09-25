import type { Role } from "@prisma/client";

const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export function hasRole(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full access including billing and workspace deletion",
  ADMIN: "Manage team, infrastructure, campaigns and settings",
  MEMBER: "Create leads, lists, sequences and campaigns",
  VIEWER: "Read-only access to dashboards and data",
};

export const PERMISSIONS: { label: string; min: Role }[] = [
  { label: "View dashboards, leads & campaigns", min: "VIEWER" },
  { label: "Find leads, build lists & verify", min: "MEMBER" },
  { label: "Create & launch campaigns", min: "MEMBER" },
  { label: "Reply from the unified inbox", min: "MEMBER" },
  { label: "Manage domains, inboxes & warmup", min: "ADMIN" },
  { label: "Invite & manage team members", min: "ADMIN" },
  { label: "Create & revoke API keys", min: "ADMIN" },
  { label: "Change plan & billing", min: "OWNER" },
];
