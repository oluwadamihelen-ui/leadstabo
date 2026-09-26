import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Crosshair,
  Flame,
  Globe,
  Handshake,
  Mail,
  MailCheck,
  MessageSquareReply,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Pricing } from "./pricing";
import { BRAND, productOf } from "@/config/brand";

const STEPS = [
  { icon: Crosshair, title: "Find your ICP", body: "Define who you help — industry, titles, pains and objections." },
  { icon: Search, title: "Find leads", body: "Search 400M+ B2B contacts with precise filters or plain English." },
  { icon: MailCheck, title: "Verify", body: "Only valid emails reach campaigns. Bounce rates stay under 2%." },
  { icon: Handshake, title: "Create your offer", body: "Package value, proof and a CTA the AI can pitch." },
  { icon: Wand2, title: "Personalize", body: "Variables and AI openers make every email feel 1:1." },
  { icon: Send, title: "Send", body: "Warmed, authenticated inboxes send inside safe daily limits." },
  { icon: Mail, title: "Follow up", body: "Multi-step sequences stop the moment a prospect replies." },
  { icon: MessageSquareReply, title: "Convert", body: "AI classifies replies and drafts the response that books the call." },
];

const FAQ = [
  ["Do I need my own email accounts?", "Yes — connect Google Workspace, Microsoft 365 or any SMTP inbox. Leadabo handles DNS checks, warmup, limits and rotation so they stay healthy."],
  ["Where do the leads come from?", "Our lead database has 400M+ B2B contacts. Search it, reveal only the leads you want (1 credit each) and verify before sending."],
  ["Will my emails land in spam?", "Leadabo enforces verification, SPF/DKIM/DMARC checks, warmup and daily limits, and auto-pauses inboxes when bounces spike."],
  ["Is there a learning curve?", "Every plan includes Leadabo Academy — a 7-day program that walks you from zero to a live campaign."],
  ["Can I cancel anytime?", "Yes. Plans are month-to-month, or save 20% billed annually."],
];

export default async function Landing() {
  const [session, plans] = await Promise.all([getSession(), db.plan.findMany({ orderBy: { sortOrder: "asc" } })]);
  const cta = session ? { href: "/dashboard", label: "Open dashboard" } : { href: "/signup", label: "Start Building" };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#platform" className="hover:text-foreground">
              Platform
            </a>
            <a href="#academy" className="hover:text-foreground">
              Academy
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!session && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-[0.15] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/[0.05] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> The outbound acquisition operating system
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">
            Build your <span className="text-primary">outbound engine.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Find the right leads, reach them with personalized outreach, and turn cold prospects into conversations — all from one platform.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="glow-primary h-11 px-6 text-[15px]">
              <Link href={cta.href}>
                {cta.label} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-11 px-6 text-[15px]">
              <a href="#how">See How It Works</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">500 free lead credits · No credit card required</p>

          {/* Product preview */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-foreground/10 to-transparent" />
            <div className="relative overflow-hidden rounded-2xl border bg-surface text-left shadow-2xl">
              <div className="flex items-center gap-1.5 border-b px-4 py-3">
                <span className="size-2.5 rounded-full bg-foreground/10" />
                <span className="size-2.5 rounded-full bg-foreground/10" />
                <span className="size-2.5 rounded-full bg-foreground/10" />
                <span className="ml-3 text-xs text-muted-foreground">app.leadabo.com/dashboard</span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-4">
                {[
                  ["Emails sent", "12,482", "+18%"],
                  ["Open rate", "61.4%", "+4%"],
                  ["Reply rate", "8.7%", "+2.1%"],
                  ["Meetings", "47", "+12"],
                ].map(([k, v, d]) => (
                  <div key={k} className="rounded-xl border bg-card p-4">
                    <p className="label-caps">{k}</p>
                    <p className="mt-2 text-2xl font-semibold">{v}</p>
                    <p className="mt-1 text-xs text-success">{d} this week</p>
                  </div>
                ))}
                <div className="rounded-xl border bg-card p-4 sm:col-span-3">
                  <p className="text-[13px] font-medium">Campaign performance</p>
                  <svg viewBox="0 0 600 140" className="mt-3 h-32 w-full" aria-hidden>
                    <path d="M0 110 C60 100 90 60 150 70 S250 30 300 45 S400 20 450 35 S550 15 600 20" fill="none" stroke="var(--series-1)" strokeWidth="2" />
                    <path d="M0 125 C60 120 90 95 150 100 S250 75 300 85 S400 70 450 78 S550 60 600 62" fill="none" stroke="var(--series-3)" strokeWidth="2" />
                    <path d="M0 135 C60 133 90 125 150 127 S250 118 300 121 S400 112 450 115 S550 108 600 105" fill="none" stroke="var(--series-2)" strokeWidth="2" />
                  </svg>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[13px] font-medium">Recent replies</p>
                  {[
                    ["Amara O.", "Meeting requested"],
                    ["James W.", "Interested"],
                    ["Priya P.", "Question"],
                  ].map(([n, s]) => (
                    <div key={n} className="mt-3 flex items-center justify-between text-xs">
                      <span>{n}</span>
                      <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="label-caps text-primary">How Leadabo works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">One system. From ideal customer to booked meeting.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="bg-background p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-5 text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="mt-6 font-semibold">{s.title}</p>
                <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform */}
      <section id="platform" className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl space-y-24 px-4 sm:px-6">
          <Feature
            eyebrow="Lead generation"
            title="400M+ contacts. Filter to exactly who you help."
            body="Industry, title, seniority, department, company size, revenue, location and technology — or describe your ICP in plain English and let AI set the filters. Reveal only the leads you want."
            points={["People & company views", "Net-new only toggle", "Export to CSV or straight into lists"]}
            icon={Target}
            visual={
              <div className="space-y-2">
                {[
                  ["Amara Okafor", "Head of Growth", "Summit Health"],
                  ["James Walsh", "Founder", "Maple Cloud"],
                  ["Priya Patel", "VP Sales", "Atlas Labs"],
                  ["Kwame Mensah", "Proprietor", "Crest Schools"],
                ].map(([n, t, c]) => (
                  <div key={n} className="flex items-center gap-3 rounded-lg border bg-muted/60 px-3 py-2.5 text-[13px]">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{n.split(" ").map((x) => x[0]).join("")}</span>
                    <span className="flex-1 font-medium">{n}</span>
                    <span className="hidden text-muted-foreground sm:inline">{t}</span>
                    <span className="text-muted-foreground">{c}</span>
                    <span className="rounded border border-success/30 bg-success/10 px-1.5 text-[10px] text-success">Valid</span>
                  </div>
                ))}
              </div>
            }
          />
          <Feature
            reverse
            eyebrow="Outreach"
            title="Sequences that sound human — and stop when they reply."
            body="A visual sequence builder, a composer with live variable preview, spam-risk scoring and AI that writes, shortens, personalizes and follows up using each lead’s real data."
            points={["7-step campaign wizard", "AI-classified unified inbox", "Suggested responses for every reply"]}
            icon={Mail}
            visual={
              <div className="space-y-2">
                {[
                  ["Email 1", "Day 0", "{{first_name}}, quick idea for {{company_name}}"],
                  ["Email 2", "Day 3", "Re: quick idea — new angle"],
                  ["Email 3", "Day 7", "Case study for {{company_name}}"],
                  ["Email 4", "Day 12", "Should I close your file?"],
                ].map(([s, d, t], i) => (
                  <div key={s}>
                    {i > 0 && <div className="ml-6 h-3 w-px bg-border" />}
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/60 px-3 py-2.5 text-[13px]">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Mail className="size-3.5" />
                      </span>
                      <span className="label-caps w-28 shrink-0 whitespace-nowrap text-foreground/80">
                        {s} · {d}
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">{t}</span>
                    </div>
                  </div>
                ))}
              </div>
            }
          />
          <Feature
            eyebrow="Infrastructure"
            title="Deliverability is the product."
            body="Add secondary domains, publish SPF, DKIM and DMARC with guided checks, connect inboxes, warm them automatically and let Leadabo enforce limits and pause anything that starts to bounce."
            points={["Domain health & reputation", "Automated warmup ramp", "Encrypted credentials, never exposed"]}
            icon={ShieldCheck}
            visual={
              <div className="space-y-2">
                {[
                  ["trystabo.com", "96"],
                  ["getstabo.co", "94"],
                  ["stabomail.com", "92"],
                ].map(([d, h]) => (
                  <div key={d} className="flex items-center gap-3 rounded-lg border bg-muted/60 px-3 py-2.5 text-[13px]">
                    <Globe className="size-4 text-muted-foreground" />
                    <span className="flex-1 font-medium">{d}</span>
                    {["SPF", "DKIM", "DMARC"].map((r) => (
                      <span key={r} className="rounded border border-success/30 bg-success/10 px-1.5 text-[10px] text-success">
                        {r}
                      </span>
                    ))}
                    <span className="w-8 text-right text-success">{h}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 rounded-lg border bg-muted/60 px-3 py-2.5 text-[13px]">
                  <Flame className="size-4 text-primary" />
                  <span className="flex-1">Warmup · nick@trystabo.com</span>
                  <span className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full w-4/5 bg-primary" />
                  </span>
                </div>
              </div>
            }
          />
          <Feature
            reverse
            eyebrow="Analytics"
            title="Know exactly what’s working."
            body="Sends, deliveries, bounces, opens, clicks, replies, positive replies and meetings — by campaign, step, inbox, domain and lead, with trends against last period."
            points={["Step-level reply rates", "Inbox & domain performance", "Lead engagement ranking"]}
            icon={BarChart3}
            visual={
              <div className="flex h-44 items-end gap-2 rounded-lg border bg-muted/60 p-4">
                {[40, 55, 48, 70, 62, 85, 78, 92, 88, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-[var(--series-1)]" style={{ height: `${h}%`, opacity: 0.5 + i * 0.05 }} />
                ))}
              </div>
            }
          />
        </div>
      </section>

      {/* Academy */}
      <section id="academy" className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-[#6D28D9] to-[#3B1370] p-8 sm:p-12">
            <div className="absolute left-10 top-12 h-24 w-[3px] bg-gradient-to-b from-primary to-transparent" />
            <div className="absolute -right-24 -top-24 size-80 rounded-full bg-info/15 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-2">
              <div className="pl-6">
                <p className="label-caps flex items-center gap-2 text-primary">
                  <BookOpen className="size-3.5" /> Leadabo Academy
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Learn the system. Then run it.</h2>
                <p className="mt-4 text-white/60">A 7-day live program built into the product. Each day ends with a task you complete inside Leadabo — by Day 7 your first campaign is live.</p>
                <Button asChild className="mt-8">
                  <Link href={cta.href}>
                    Start Day 1 <ArrowRight />
                  </Link>
                </Button>
              </div>
              <ol className="space-y-2">
                {["Intro, Mindset & Infrastructure", "Who You Help & What You Sell", "Build Your ICP & Offer", "Email Infrastructure", "Find Leads", "Write Your Outreach", "Launch & Optimize"].map((t, i) => (
                  <li key={t} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">
                    <span className="w-14 text-[11px] font-semibold uppercase tracking-widest text-info">Day {i + 1}</span>
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="label-caps text-primary">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Simple plans that scale with your pipeline.</h2>
          </div>
          <Pricing plans={plans} ctaHref={cta.href} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Questions, answered.</h2>
          <div className="mt-10 space-y-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Your next 20 clients are in the database.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Build the engine that finds them, reaches them and books the call.</p>
          <Button asChild size="lg" className="glow-primary mt-8 h-11 px-6">
            <Link href={cta.href}>
              {cta.label} <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <div className="text-center sm:text-left">
            <p>{productOf}</p>
            <p className="mt-1 text-muted-foreground/70">© {new Date().getFullYear()} {BRAND.company}. All rights reserved.</p>
          </div>
          <div className="flex gap-4">
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <a href="mailto:hello@leadabo.com" className="hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  eyebrow,
  title,
  body,
  points,
  icon: Icon,
  visual,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  icon: React.ComponentType<{ className?: string }>;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="label-caps flex items-center gap-2 text-primary">
          <Icon className="size-3.5" /> {eyebrow}
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-4 leading-7 text-muted-foreground">{body}</p>
        <ul className="mt-6 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-sm">
              <Check className="size-4 text-primary" /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border bg-card p-5">{visual}</div>
    </div>
  );
}
