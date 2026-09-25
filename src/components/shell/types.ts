export interface ShellNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ShellData {
  user: { name: string; email: string; avatarUrl: string | null };
  workspace: { id: string; name: string };
  role: string;
  workspaces: { id: string; name: string; role: string }[];
  plan: { name: string; monthlySends: number };
  credits: { balance: number; monthly: number; lifetime: number };
  usage: { sent: number };
  notifications: ShellNotification[];
  unread: number;
}
