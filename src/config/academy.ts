// Academy curriculum. Seeded into AcademyCourse / AcademyModule / AcademyLesson.
// Lesson `content` uses a small markdown subset rendered by <LessonContent />.

export interface LessonSeed {
  slug: string;
  title: string;
  durationMin: number;
  summary: string;
  keyPoints: string[];
  content: string;
  resources?: { label: string; href: string }[];
}

export interface ModuleSeed {
  dayLabel: string;
  title: string;
  description: string;
  lessons: LessonSeed[];
}

export interface CourseSeed {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  kind: "COURSE" | "CHALLENGE";
  badge?: string;
  priceLabel?: string;
  accent: string;
  modules: ModuleSeed[];
}

const outbound: CourseSeed = {
  slug: "outbound-acquisition",
  title: "Leadstabo Outbound Acquisition",
  subtitle: "The 7-day system to find clients with cold email",
  description:
    "A live, 7-day program that takes you from zero to a running outbound engine: mindset, infrastructure, ICP, offer, leads, copy and launch. Every day ends with a task you complete inside Leadstabo.",
  kind: "CHALLENGE",
  badge: "Live cohort",
  accent: "orange",
  modules: [
    {
      dayLabel: "Day 1",
      title: "Intro, Mindset & Infrastructure",
      description: "Why cold outreach still works, the outbound operating system, and the foundations you need before sending a single email.",
      lessons: [
        {
          slug: "why-cold-outreach-works",
          title: "Why cold outreach still works",
          durationMin: 12,
          summary: "Outbound is the only acquisition channel you fully control. Here is why it still wins in 2026 — and why most people fail at it.",
          keyPoints: ["You control volume, targeting and timing", "Most failures are infrastructure or targeting, not copy", "Treat outbound as a system, not a campaign"],
          content: `## The only channel you control
Referrals are unpredictable, ads get more expensive every quarter, and content takes months to compound. **Cold outreach is the one channel where you decide who hears from you, what they hear and when.**

## Why most people fail
When outbound "doesn't work", it is almost never the copy. It is usually one of three things:
- **Deliverability** — emails land in spam because domains and inboxes weren't set up properly.
- **Targeting** — the list was too broad, so the message didn't resonate with anyone.
- **Offer** — there was no compelling reason to reply *now*.

> Outbound is a system. Fix the system and the results follow.

## What you'll build this week
By Day 7 you will have a warmed sending infrastructure, a defined ICP, a verified lead list, a 4-step sequence and a live campaign inside Leadstabo.`,
        },
        {
          slug: "the-outbound-operating-system",
          title: "The outbound operating system",
          durationMin: 15,
          summary: "The ten stages every successful outbound program moves through, from ICP to conversion.",
          keyPoints: ["ICP → Leads → Verify → Offer → Personalize → Write → Sequence → Send → Track → Convert", "Each stage has one metric that matters", "Bottlenecks move — measure weekly"],
          content: `## The pipeline
Leadstabo is built around one flow:

1. **ICP** — who exactly you help
2. **Find leads** — build a list that matches the ICP
3. **Verify** — remove invalid and risky emails
4. **Create your offer** — a reason to reply
5. **Personalize** — make every email feel 1:1
6. **Write** — short, specific copy
7. **Sequence** — 3–5 touches over ~2 weeks
8. **Send** — from warmed, authenticated inboxes
9. **Track** — opens, replies, positive replies, meetings
10. **Convert** — handle replies fast and book calls

## One metric per stage
Don't drown in dashboards. Verification → *valid rate*. Sending → *bounce rate under 2%*. Copy → *reply rate*. Offer → *positive reply rate*. Conversion → *meetings booked*.`,
        },
        {
          slug: "infrastructure-foundations",
          title: "Infrastructure foundations",
          durationMin: 18,
          summary: "Why you never send cold email from your main domain, and the minimum setup you need.",
          keyPoints: ["Use secondary domains to protect your brand", "2–3 inboxes per domain, ~30–40 emails/day each", "Warm up every inbox for 14+ days"],
          content: `## Protect your main domain
Never send cold email from the domain your customers, invoices and team use. Buy **secondary domains** that look like your brand (e.g. \`getacme.com\`, \`tryacme.com\`) and redirect them to your website.

## The capacity formula
Each inbox should send **30–40 cold emails per day** at most. Plan backwards:

- Target 600 emails/day → 15–20 inboxes
- 2–3 inboxes per domain → 6–8 domains

## Authentication
Every domain needs **SPF, DKIM and DMARC**. Leadstabo checks all three for you under *Settings → Infrastructure → Sending Domains*.

## Task
Add your first sending domain in Leadstabo and publish the DNS records it shows you.`,
          resources: [{ label: "Add a sending domain", href: "/settings/infrastructure/domains" }],
        },
      ],
    },
    {
      dayLabel: "Day 2",
      title: "Who You Help & What You Sell",
      description: "Choose a market you can actually win, and package what you do into something people want to buy.",
      lessons: [
        {
          slug: "choosing-your-market",
          title: "Choosing a market you can win",
          durationMin: 14,
          summary: "The four filters for picking a niche: pain, ability to pay, reachability and your unfair advantage.",
          keyPoints: ["Pain must be urgent and expensive", "They must be able to pay", "You must be able to find them in a database", "Prefer markets where you have proof"],
          content: `## The four filters
Score each candidate market 1–5 on:

- **Pain** — is the problem urgent and expensive?
- **Ability to pay** — do they have budget and authority?
- **Reachability** — can you find them by title, industry and location?
- **Advantage** — do you have results, experience or connections here?

## Narrow beats broad
"Marketing agencies" is a category. "UK performance marketing agencies with 11–50 employees that run Meta ads for e-commerce brands" is a market. The narrower the market, the more specific — and effective — your message.`,
        },
        {
          slug: "what-you-actually-sell",
          title: "What you actually sell",
          durationMin: 12,
          summary: "People don't buy services, they buy outcomes. Reframe what you do in terms of the result.",
          keyPoints: ["Sell the outcome, not the deliverable", "Quantify the result where possible", "Remove risk with guarantees or pilots"],
          content: `## Outcomes over deliverables
Nobody wants "a school management system". They want **fees collected on time without chasing parents**. Nobody wants "SEO". They want **more inbound leads from Google**.

## A simple formula
> We help **[ICP]** achieve **[outcome]** in **[timeframe]** without **[pain they fear]**.

Write three versions of this sentence today and keep the one that makes you slightly uncomfortable because it's so specific.`,
        },
        {
          slug: "pricing-and-packaging",
          title: "Pricing and packaging",
          durationMin: 10,
          summary: "Package your service so the decision to say yes is easy.",
          keyPoints: ["One core offer, clearly priced", "Productize the delivery", "Offer a low-risk first step"],
          content: `## Productize
Turn custom work into a named package with a fixed scope, timeline and price — e.g. *Done-For-You School OS: ₦2,000,000 one-time setup + ₦60,000/term support*.

## A low-risk first step
The cold email doesn't need to sell the package. It needs to sell **the next step**: a 15-minute call, an audit, or a free sample.`,
        },
      ],
    },
    {
      dayLabel: "Day 3",
      title: "Build Your ICP & Offer",
      description: "Turn your market into a precise Ideal Customer Profile and an offer the AI can write from.",
      lessons: [
        {
          slug: "building-your-icp",
          title: "Building your ICP",
          durationMin: 16,
          summary: "Firmographics, personas, pains, goals and objections — the five parts of a usable ICP.",
          keyPoints: ["Firmographics: industry, size, location", "Persona: the title that feels the pain", "Pains, goals, objections in their words"],
          content: `## The five parts
1. **Firmographics** — industry, company size, location, revenue, technologies
2. **Persona** — the job title that owns the problem and the budget
3. **Pains** — what keeps them up at night, in their words
4. **Goals** — what success looks like for them this year
5. **Objections** — why they'd say no

## Save it in Leadstabo
Go to *Outreach → ICPs & Offers* and create your ICP. The AI writer uses it to generate on-target sequences automatically.`,
          resources: [{ label: "Create an ICP", href: "/outreach/playbook" }],
        },
        {
          slug: "crafting-an-irresistible-offer",
          title: "Crafting an irresistible offer",
          durationMin: 14,
          summary: "Value proposition, proof and call-to-action — the offer template that gets replies.",
          keyPoints: ["Value prop: outcome + mechanism", "Proof: numbers, names, case studies", "CTA: one small, specific ask"],
          content: `## Offer template
- **Value proposition** — the outcome and *how* you deliver it
- **Proof** — a result, client name or case study
- **CTA** — the single, low-friction next step

## Example
> We build, brand and hand over your complete school management system in 1 week — so you collect fees on time and stop drowning in admin. 40+ Nigerian schools use it. Worth a quick call?`,
        },
        {
          slug: "validating-before-you-scale",
          title: "Validating before you scale",
          durationMin: 9,
          summary: "Test your ICP and offer with 100–200 leads before scaling.",
          keyPoints: ["Start with 100–200 leads", "Look for a 3%+ reply rate", "Change one variable at a time"],
          content: `## Small batches first
Launch to 100–200 leads. If reply rate is under 1%, revisit targeting or offer before touching copy. If it's above 3% with positive replies, scale.

## One variable at a time
Test subject line **or** opener **or** CTA — never all three at once, or you won't know what worked.`,
        },
      ],
    },
    {
      dayLabel: "Day 4",
      title: "Email Infrastructure",
      description: "Domains, inboxes, DNS authentication and warmup — the deliverability layer.",
      lessons: [
        {
          slug: "domains-and-dns",
          title: "Domains, SPF, DKIM & DMARC",
          durationMin: 17,
          summary: "What each DNS record does and how to verify them in Leadstabo.",
          keyPoints: ["SPF: who may send for your domain", "DKIM: cryptographic signature", "DMARC: policy + reporting"],
          content: `## The three records
- **SPF** lists the servers allowed to send for your domain.
- **DKIM** signs every email so receivers can confirm it wasn't altered.
- **DMARC** tells receivers what to do when SPF/DKIM fail, and sends you reports.

## Verify in Leadstabo
Add the records shown on the domain's setup page, then click **Verify DNS**. Every record turns green when it's published correctly.`,
          resources: [{ label: "Sending domains", href: "/settings/infrastructure/domains" }],
        },
        {
          slug: "inboxes-and-limits",
          title: "Inboxes and sending limits",
          durationMin: 11,
          summary: "Connecting Google Workspace, Microsoft 365 or SMTP inboxes and setting safe limits.",
          keyPoints: ["Connect via OAuth where possible", "Start at 20/day, ramp to 40", "Keep bounce rate under 2%"],
          content: `## Connecting inboxes
Leadstabo supports Google Workspace, Microsoft 365 and any SMTP provider. Credentials are encrypted at rest and never exposed to the browser.

## Safe limits
Start new inboxes at **20/day** and ramp to **30–40/day** after warmup. If bounce rate climbs above **2%**, pause and re-verify your list.`,
        },
        {
          slug: "warmup-explained",
          title: "Warmup explained",
          durationMin: 10,
          summary: "How warmup builds sender reputation before you go live.",
          keyPoints: ["14–21 days minimum", "Gradual daily ramp", "Keep warmup running during campaigns"],
          content: `## What warmup does
Warmup sends and replies to emails between real inboxes, gradually increasing volume. Mailbox providers see positive engagement and learn to trust your sender.

## Rules of thumb
- Warm for **14–21 days** before sending cold.
- Ramp by **2–3 emails/day**.
- Leave warmup **on** while campaigns run.`,
          resources: [{ label: "Warmup dashboard", href: "/settings/infrastructure/warmup" }],
        },
      ],
    },
    {
      dayLabel: "Day 5",
      title: "Find Leads",
      description: "Search 400M+ contacts, build targeted lists and verify every email.",
      lessons: [
        {
          slug: "searching-the-database",
          title: "Searching the lead database",
          durationMin: 13,
          summary: "Translate your ICP into filters: industry, title, seniority, size, location, technology.",
          keyPoints: ["Start from the ICP, not the filters", "Titles + seniority beat keywords", "Use 'Has email' to save credits"],
          content: `## From ICP to filters
Map each ICP attribute to a filter in *Leadgen → Find Leads*: industry, job title, seniority, department, company size, revenue, location and technologies.

## Tips
- Use **job titles + seniority** for precision.
- Keep **Has email** on — you only spend credits on reachable leads.
- Save good searches as lists so your team can reuse them.`,
          resources: [{ label: "Find leads", href: "/leadgen/find" }],
        },
        {
          slug: "building-lead-lists",
          title: "Building lead lists",
          durationMin: 8,
          summary: "Organize leads into lists by segment so you can personalize at scale.",
          keyPoints: ["One list per segment", "Name lists clearly", "Don't mix personas in one campaign"],
          content: `## Segment everything
Create one list per segment — e.g. *US SaaS Founders*, *UK Marketing Agencies*, *Dentists – California*. Each segment gets its own campaign and copy.`,
        },
        {
          slug: "email-verification",
          title: "Email verification",
          durationMin: 9,
          summary: "Why you must verify every email and what each status means.",
          keyPoints: ["Valid: safe to send", "Catch-all: send with care", "Invalid/risky: never send"],
          content: `## Statuses
- **Valid** — mailbox exists. Send.
- **Catch-all** — domain accepts everything. Send in small volume.
- **Risky** — role-based or low quality. Skip.
- **Invalid** — doesn't exist. Never send.
- **Unknown** — server didn't respond. Re-verify later.

Leadstabo only lets verified addresses into campaigns, which keeps your bounce rate low.`,
          resources: [{ label: "Verify leads", href: "/leadgen/verify" }],
        },
      ],
    },
    {
      dayLabel: "Day 6",
      title: "Write Your Outreach",
      description: "Short, specific, personalized emails and a follow-up sequence that gets replies.",
      lessons: [
        {
          slug: "anatomy-of-a-cold-email",
          title: "Anatomy of a cold email",
          durationMin: 15,
          summary: "Subject, opener, problem, offer, CTA — and why under 100 words wins.",
          keyPoints: ["Subject: 2–5 words, lowercase-friendly", "Opener: about them, not you", "One CTA, easy to say yes to"],
          content: `## The structure
1. **Subject** — short and specific: *{{first_name}}, quick idea*
2. **Opener** — a personalized observation about them
3. **Problem** — the pain in their words
4. **Offer** — outcome + proof in one or two sentences
5. **CTA** — one small ask

Keep it **under 100 words**. Read it on your phone — if you have to scroll, cut.`,
        },
        {
          slug: "personalization-at-scale",
          title: "Personalization at scale",
          durationMin: 12,
          summary: "Variables, AI openers and segment-level relevance.",
          keyPoints: ["Variables: {{first_name}}, {{company_name}}", "Segment relevance beats fake flattery", "Use AI to personalize openers"],
          content: `## Variables
Use \`{{first_name}}\`, \`{{company_name}}\`, \`{{job_title}}\` and \`{{industry}}\`. Add fallbacks: \`{{first_name|there}}\`.

## Relevance > flattery
"Loved your recent post!" is noise. A sentence that proves you understand their segment's problem is signal. Use the **AI → Make it more personalized** button in the composer to draft openers from lead data.`,
        },
        {
          slug: "follow-up-sequences",
          title: "Follow-up sequences",
          durationMin: 11,
          summary: "Most replies come from follow-ups. Build a 4-step sequence over 12 days.",
          keyPoints: ["4 steps: Day 0, 3, 7, 12", "Each follow-up adds new value", "End with a polite break-up email"],
          content: `## A proven cadence
- **Email 1 — Day 0**: the core pitch
- **Email 2 — Day 3**: bump with a new angle
- **Email 3 — Day 7**: proof or a case study
- **Email 4 — Day 12**: break-up — "should I close your file?"

Build it visually in *Outreach → Sequences*.`,
          resources: [{ label: "Sequence builder", href: "/outreach/sequences" }],
        },
      ],
    },
    {
      dayLabel: "Day 7",
      title: "Launch & Optimize",
      description: "Launch your campaign, read the metrics that matter and turn replies into meetings.",
      lessons: [
        {
          slug: "launching-your-campaign",
          title: "Launching your campaign",
          durationMin: 10,
          summary: "The pre-flight checklist and the campaign wizard, step by step.",
          keyPoints: ["Verified leads only", "Warmed, authenticated inboxes", "Preview every step with real lead data"],
          content: `## Pre-flight checklist
- [x] Domains pass SPF, DKIM, DMARC
- [x] Inboxes warmed 14+ days
- [x] List verified
- [x] Sequence previewed with real lead data
- [x] Daily limit set per inbox

Then launch from *Outreach → Campaigns → New campaign*.`,
          resources: [{ label: "New campaign", href: "/outreach/campaigns/new" }],
        },
        {
          slug: "metrics-that-matter",
          title: "Metrics that matter",
          durationMin: 12,
          summary: "Benchmarks for open, reply, positive-reply and bounce rates.",
          keyPoints: ["Bounce < 2%", "Reply rate 3–8%", "Positive replies ~40% of replies"],
          content: `## Benchmarks
| Metric | Healthy |
|---|---|
| Bounce rate | under 2% |
| Reply rate | 3–8% |
| Positive reply share | 30–50% |
| Meetings / 1,000 sent | 5–15 |

Open rates are directional only — privacy features inflate them. **Optimize for replies.**`,
          resources: [{ label: "Analytics", href: "/analytics" }],
        },
        {
          slug: "handling-replies",
          title: "Handling replies & converting",
          durationMin: 13,
          summary: "Reply within an hour, use AI-suggested responses and move every positive reply to a booked call.",
          keyPoints: ["Speed wins — reply within 60 minutes", "Classify and label every reply", "Always propose specific times"],
          content: `## Speed to lead
Replies go cold fast. Leadstabo classifies every reply (interested, question, meeting requested, not interested, out of office) and drafts a suggested response.

## Always propose times
Don't ask "when works?". Say "Does Tuesday 2pm or Thursday 11am work?" — or send your calendar link.

## You're live
Congratulations — you now have a working outbound engine. Keep iterating weekly.`,
          resources: [{ label: "Replies", href: "/outreach/replies" }],
        },
      ],
    },
  ],
};

const deliverability: CourseSeed = {
  slug: "deliverability-masterclass",
  title: "Deliverability Masterclass",
  subtitle: "Stay out of spam at any volume",
  description: "Advanced sender reputation, bounce management and inbox placement testing for teams sending 500+ emails a day.",
  kind: "COURSE",
  badge: "Course",
  accent: "blue",
  modules: [
    {
      dayLabel: "Module 1",
      title: "Reputation & Placement",
      description: "How mailbox providers score you and how to measure inbox placement.",
      lessons: [
        {
          slug: "how-spam-filters-think",
          title: "How spam filters think",
          durationMin: 14,
          summary: "Reputation, authentication, content and engagement — the four signals.",
          keyPoints: ["Domain & IP reputation", "Authentication alignment", "Engagement is the strongest signal"],
          content: `## The four signals
1. **Reputation** of the domain and sending IP
2. **Authentication** — SPF, DKIM and DMARC alignment
3. **Content** — links, images, trigger words
4. **Engagement** — replies, moves out of spam, deletes without reading

Engagement dominates. That's why warmup and relevant targeting matter more than clever wording.`,
        },
        {
          slug: "bounce-management",
          title: "Bounce management",
          durationMin: 9,
          summary: "Hard vs soft bounces and what to do when bounce rate spikes.",
          keyPoints: ["Hard bounces: remove immediately", "Soft bounces: retry later", "Spike > 3%: pause and re-verify"],
          content: `## Hard vs soft
A **hard bounce** means the address doesn't exist — remove it. A **soft bounce** is temporary (full mailbox, server busy).

## Spikes
Leadstabo alerts you when bounce rate spikes. Pause the campaign, re-verify the list, and resume once it's clean.`,
        },
      ],
    },
  ],
};

const copywriting: CourseSeed = {
  slug: "cold-copy-sprint",
  title: "Cold Copy Sprint",
  subtitle: "Write emails that get replies",
  description: "A 3-lesson sprint on subject lines, openers and CTAs with before/after rewrites.",
  kind: "COURSE",
  badge: "Course",
  accent: "violet",
  modules: [
    {
      dayLabel: "Sprint",
      title: "Copy that converts",
      description: "Subject lines, openers and calls-to-action.",
      lessons: [
        {
          slug: "subject-lines-that-get-opened",
          title: "Subject lines that get opened",
          durationMin: 8,
          summary: "Short, internal-looking subject lines outperform clever ones.",
          keyPoints: ["2–5 words", "Look like an internal email", "Avoid clickbait"],
          content: `## Look internal
The best subject lines look like they came from a colleague: *quick question*, *{{company_name}} hiring*, *idea for {{first_name}}*.

Avoid ALL CAPS, emojis and anything that sounds like a newsletter.`,
        },
        {
          slug: "openers-and-ctas",
          title: "Openers and CTAs",
          durationMin: 10,
          summary: "Earn the second sentence, then make the ask easy.",
          keyPoints: ["First line is about them", "Interest-based CTAs", "One question only"],
          content: `## Openers
The first line decides whether they read the second. Make it about **them** — their company, role or segment.

## CTAs
Interest-based CTAs ("Worth exploring?") get more replies than calendar asks in the first email. Save the meeting ask for when they reply.`,
        },
      ],
    },
  ],
};

export const ACADEMY_COURSES: CourseSeed[] = [outbound, deliverability, copywriting];
