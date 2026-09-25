import { SubNav } from "@/components/ui/misc";

export function LeadgenNav({ active }: { active: string }) {
  return (
    <SubNav
      active={active}
      items={[
        { href: "/leadgen/find", label: "Find Leads", badge: "New" },
        { href: "/leadgen/lists", label: "Lead Lists" },
        { href: "/leads", label: "All Leads" },
        { href: "/leadgen/verify", label: "Verify Email" },
      ]}
    />
  );
}

export function OutreachNav({ active }: { active: string }) {
  return (
    <SubNav
      active={active}
      items={[
        { href: "/outreach/campaigns", label: "Campaigns" },
        { href: "/outreach/sequences", label: "Sequences" },
        { href: "/outreach/inbox", label: "Inbox" },
        { href: "/outreach/replies", label: "Replies" },
        { href: "/outreach/playbook", label: "ICPs & Offers", badge: "New" },
      ]}
    />
  );
}

export function AcademyNav({ active }: { active: string }) {
  return (
    <SubNav
      active={active}
      items={[
        { href: "/academy", label: "Courses" },
        { href: "/academy/lessons", label: "Lessons" },
        { href: "/academy/progress", label: "Progress" },
        { href: "/academy/certificates", label: "Certificates" },
      ]}
    />
  );
}
