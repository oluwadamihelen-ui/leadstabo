import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Globe, KeyRound, LifeBuoy, Mail, MailCheck, Rocket, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Help & Support" };

const GUIDES = [
  { icon: Globe, title: "Set up a sending domain", body: "Add a secondary domain and publish SPF, DKIM and DMARC.", href: "/academy/learn/domains-and-dns" },
  { icon: Mail, title: "Connect & warm an inbox", body: "Google Workspace, Microsoft 365 or SMTP — then warm for 14+ days.", href: "/academy/learn/warmup-explained" },
  { icon: Search, title: "Find your first leads", body: "Turn your ICP into filters and build a targeted list.", href: "/academy/learn/searching-the-database" },
  { icon: MailCheck, title: "Verify before sending", body: "Only valid and catch-all emails can enter campaigns.", href: "/academy/learn/email-verification" },
  { icon: Rocket, title: "Launch a campaign", body: "The 7-step wizard from list to launch.", href: "/academy/learn/launching-your-campaign" },
  { icon: KeyRound, title: "Use the API", body: "Create a key and sync leads and campaigns programmatically.", href: "/settings/api-keys" },
];

const FAQ = [
  ["How many emails can one inbox send per day?", "We recommend 30–40 cold emails per inbox per day after a 14–21 day warmup. Scale by adding inboxes and domains rather than raising limits."],
  ["What do credits pay for?", "Revealing a lead from the database costs 1 credit, verifying an email costs 1 credit and each AI generation costs 2 credits. Sending email doesn’t use credits — it counts against your plan’s monthly sends."],
  ["Why can’t I add some leads to a campaign?", "Only leads whose email is Valid or Catch-all can receive campaign email. Verify the rest from Leadgen → Verify Email."],
  ["When do emails actually send?", "The scheduler sends due steps inside each campaign’s send window and timezone, respecting campaign and inbox daily limits. Weekends are skipped by default (Settings → Outreach)."],
  ["What happens when someone replies?", "The reply is threaded in your Inbox, classified by AI (interested, question, meeting request, not interested, out of office) and the lead leaves the sequence automatically."],
  ["Is my inbox password safe?", "Credentials are encrypted with AES-256-GCM on the server and never sent to the browser. Google and Microsoft inboxes connect with OAuth."],
  ["Can my team share a workspace?", "Yes — invite teammates from Settings → Team as Admin, Member or Viewer. Every workspace’s data is fully isolated."],
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help & Support" description="Guides, answers and a direct line to our team." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GUIDES.map((g) => (
          <Link key={g.title} href={g.href} className="group rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20">
            <g.icon className="size-5 text-primary" />
            <p className="mt-3 font-medium group-hover:text-primary">{g.title}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{g.body}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div id="faq" className="xl:col-span-2">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium">
                  {q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <LifeBuoy className="size-5 text-primary" />
            <p className="mt-3 font-semibold">Contact support</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Growth plans and above get priority chat. We reply within one business day.</p>
            <Button asChild className="mt-4 w-full">
              <a href="mailto:support@leadstabo.com?subject=Leadstabo%20support%20request">Email support</a>
            </Button>
          </Card>
          <Card className="p-5">
            <BookOpen className="size-5 text-info" />
            <p className="mt-3 font-semibold">Leadstabo Academy</p>
            <p className="mt-1 text-[13px] text-muted-foreground">The 7-day program that walks you through the entire outbound system.</p>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link href="/academy">Open the Academy</Link>
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
