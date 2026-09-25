import {
  BarChart3,
  BookOpen,
  Gauge,
  Mail,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  match?: string[];
  children?: { label: string; href: string }[];
}

export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  {
    label: "Outreach",
    href: "/outreach/campaigns",
    icon: Mail,
    badge: "New",
    match: ["/outreach"],
    children: [
      { label: "Campaigns", href: "/outreach/campaigns" },
      { label: "Sequences", href: "/outreach/sequences" },
      { label: "Inbox", href: "/outreach/inbox" },
      { label: "Replies", href: "/outreach/replies" },
      { label: "ICPs & Offers", href: "/outreach/playbook" },
    ],
  },
  {
    label: "Leadgen",
    href: "/leadgen/find",
    icon: Target,
    match: ["/leadgen", "/leads"],
    children: [
      { label: "Find Leads", href: "/leadgen/find" },
      { label: "Lead Lists", href: "/leadgen/lists" },
      { label: "All Leads", href: "/leads" },
      { label: "Verification", href: "/leadgen/verify" },
    ],
  },
  {
    label: "Academy",
    href: "/academy",
    icon: BookOpen,
    badge: "New",
    match: ["/academy"],
    children: [
      { label: "Courses", href: "/academy" },
      { label: "Lessons", href: "/academy/lessons" },
      { label: "Progress", href: "/academy/progress" },
      { label: "Certificates", href: "/academy/certificates" },
    ],
  },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings/profile", icon: Settings, match: ["/settings"] },
];
