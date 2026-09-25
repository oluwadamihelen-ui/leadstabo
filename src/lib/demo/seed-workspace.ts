// Populates a workspace with realistic demo data: companies, leads, lists, ICPs,
// domains, inboxes, warmup, sequences, campaigns, 30 days of email activity,
// conversations, replies, notifications and credit history.
// Used by `prisma/seed.ts` and the "Load sample data" onboarding action.
import type { EmailStatus, Prisma, PrismaClient, ReplyCategory } from "@prisma/client";
import { prospects } from "@/lib/providers/leads/dataset";
import { requiredRecords } from "@/lib/services/domain-records";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const DAY = 86400_000;
const daysAgo = (d: number, hour = 10, jitterMin = 0) => {
  const x = new Date(Date.now() - d * DAY);
  x.setHours(hour, jitterMin, 0, 0);
  return x;
};

const SEQ_SAAS = [
  {
    delayDays: 0,
    subject: "{{first_name}}, quick idea for {{company_name}}",
    body: "Hi {{first_name}},\n\nMost {{job_title}}s I talk to at {{industry}} companies say pipeline is the #1 thing keeping them up at night — especially when referrals dry up.\n\nWe help B2B teams like {{company_name}} book 15–25 qualified meetings a month with done-for-you outbound, without hiring SDRs.\n\nWorth a 15-minute chat next week?\n\nBest,\n{{sender_name}}",
  },
  {
    delayDays: 3,
    subject: "Re: {{first_name}}, quick idea for {{company_name}}",
    body: "Hi {{first_name}},\n\nFloating this up — we just helped a {{industry}} team add $340k in pipeline in 60 days using the same playbook.\n\nOpen to seeing how it would work for {{company_name}}?\n\n{{sender_name}}",
  },
  {
    delayDays: 7,
    subject: "case study for {{company_name}}",
    body: "Hi {{first_name}},\n\nThought this might be useful: a 2-page breakdown of how we took a 20-person SaaS from 4 to 22 demos a month.\n\nWant me to send it over?\n\n{{sender_name}}",
  },
  {
    delayDays: 12,
    subject: "should I close your file?",
    body: "Hi {{first_name}},\n\nI haven't heard back, so I'll assume outbound isn't a priority for {{company_name}} right now.\n\nIf that changes, just reply \"later\" and I'll check back next quarter.\n\n{{sender_name}}",
  },
];

const SEQ_AGENCY = [
  {
    delayDays: 0,
    subject: "partnership idea — {{company_name}}",
    body: "Hi {{first_name}},\n\nWe work with a handful of agencies who resell our outbound engine to their clients under their own brand.\n\nTypical partner adds $8–15k MRR within a quarter. Would that be interesting for {{company_name}}?\n\n{{sender_name}}",
  },
  {
    delayDays: 4,
    subject: "Re: partnership idea — {{company_name}}",
    body: "Hi {{first_name}},\n\nQuick follow-up — happy to share the partner deck and margins if useful.\n\n{{sender_name}}",
  },
  {
    delayDays: 9,
    subject: "last note",
    body: "Hi {{first_name}},\n\nLast note from me. If white-label outbound ever makes sense for {{company_name}}, I'm one reply away.\n\n{{sender_name}}",
  },
];

const REPLIES: { category: ReplyCategory; body: string }[] = [
  { category: "MEETING_REQUEST", body: "Thanks for reaching out — this is timely. Can you do Thursday at 2pm? Send me a calendar invite." },
  { category: "INTERESTED", body: "Interesting, tell me more. We've been struggling to get consistent pipeline this year." },
  { category: "QUESTION", body: "How does pricing work for a team of our size? And do you handle the domains?" },
  { category: "NEGATIVE", body: "Not interested at the moment, please remove me from your list." },
  { category: "OUT_OF_OFFICE", body: "I'm out of the office until Monday with limited access to email. I'll respond when I'm back." },
  { category: "POSITIVE", body: "Thanks for the case study, really appreciate it. Looping in our Head of Sales." },
  { category: "INTERESTED", body: "Sounds good — who else in our space are you working with?" },
  { category: "MEETING_REQUEST", body: "Let's chat. Does next Tuesday morning work? Here's my calendar: cal.com/example" },
  { category: "QUESTION", body: "Do you work with companies outside the US?" },
];

const SUGGESTED: Record<string, string> = {
  MEETING_REQUEST: "Hi {{first_name}},\n\nThursday at 2pm works — invite is on its way. Looking forward to it!\n\nNicholas",
  INTERESTED: "Hi {{first_name}},\n\nGlad this resonated. The quickest way to see if it's a fit is a 15-minute call — does Tuesday or Thursday afternoon work?\n\nNicholas",
  QUESTION: "Hi {{first_name}},\n\nGreat question — pricing depends on volume, but most teams your size start on our Growth plan. Happy to walk you through it on a quick call?\n\nNicholas",
  NEGATIVE: "Hi {{first_name}},\n\nUnderstood — thanks for letting me know. I've removed you from this sequence.\n\nNicholas",
  OUT_OF_OFFICE: "(No reply needed — the sequence will resume after they're back.)",
  POSITIVE: "Hi {{first_name}},\n\nThanks! Happy to set up a quick intro call with your Head of Sales — what does their calendar look like this week?\n\nNicholas",
};

export async function seedDemoWorkspace(db: PrismaClient, workspaceId: string, ownerId: string) {
  const r = rng(42);

  // ── Companies & leads ────────────────────────────────────────────────
  const pool = prospects();
  const segments = [
    pool.filter((p) => p.company.industry === "Software" && ["United States", "Canada"].includes(p.country)).slice(0, 20),
    pool.filter((p) => p.company.industry === "Marketing & Advertising" && ["United Kingdom", "United States"].includes(p.country)).slice(0, 20),
    pool.filter((p) => p.company.industry === "Education Management" && ["Nigeria", "Kenya", "South Africa"].includes(p.country)).slice(0, 16),
    pool.filter((p) => p.company.industry === "Healthcare" && ["South Africa", "Australia"].includes(p.country)).slice(0, 16),
  ];
  const chosen = segments.flat();
  const companyMap = new Map<string, string>();
  for (const p of chosen) {
    if (companyMap.has(p.company.domain)) continue;
    const c = await db.company.create({
      data: {
        workspaceId,
        name: p.company.name,
        domain: p.company.domain,
        website: `https://${p.company.domain}`,
        industry: p.company.industry,
        size: p.company.size,
        revenue: p.company.revenue,
        location: `${p.city}, ${p.country}`,
        country: p.country,
        description: p.company.description,
        technologies: p.company.technologies,
        linkedinUrl: p.company.linkedinUrl,
        founded: p.company.founded,
      },
    });
    companyMap.set(p.company.domain, c.id);
  }

  const statusFor = (i: number): EmailStatus => {
    const x = i % 20;
    if (x < 14) return "VALID";
    if (x < 16) return "CATCH_ALL";
    if (x < 17) return "RISKY";
    if (x < 18) return "INVALID";
    return "UNVERIFIED";
  };
  const leads = await db.lead.createManyAndReturn({
    data: chosen.map((p, i) => {
      const status = statusFor(i);
      return {
        workspaceId,
        companyId: companyMap.get(p.company.domain)!,
        externalId: p.externalId,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        emailStatus: status,
        verifiedAt: status === "UNVERIFIED" ? null : daysAgo(25 - (i % 10)),
        title: p.title,
        seniority: p.seniority,
        department: p.department,
        industry: p.company.industry,
        location: `${p.city}, ${p.country}`,
        country: p.country,
        linkedinUrl: p.linkedinUrl,
        keywords: p.keywords,
        source: "lead_database",
        createdAt: daysAgo(34 - (i % 6)),
      };
    }),
  });
  await db.leadActivity.createMany({
    data: leads.flatMap((l) => [
      { leadId: l.id, type: "added", description: "Added from lead database", createdAt: l.createdAt },
      ...(l.verifiedAt ? [{ leadId: l.id, type: "verified", description: `Email verified: ${l.emailStatus.toLowerCase().replace("_", "-")}`, createdAt: l.verifiedAt }] : []),
    ]),
  });

  const seg = (i: number) => leads.filter((l) => segments[i].some((p) => p.email === l.email));
  const lists = [
    { name: "US SaaS Founders", description: "Founders & sales leaders at US and Canadian software companies", leads: seg(0) },
    { name: "UK Marketing Agencies", description: "Agency owners and directors in the UK and US", leads: seg(1) },
    { name: "African Private Schools", description: "School owners and administrators in Nigeria, Kenya & South Africa", leads: seg(2) },
    { name: "Healthcare Clinics", description: "Clinic and practice decision makers", leads: seg(3) },
  ];
  const listRows = [];
  for (const [i, l] of lists.entries()) {
    const row = await db.leadList.create({
      data: { workspaceId, name: l.name, description: l.description, createdAt: daysAgo(33 - i * 3), members: { create: l.leads.map((x) => ({ leadId: x.id })) } },
    });
    listRows.push(row);
  }

  // ── ICPs & offers ────────────────────────────────────────────────────
  await db.icp.createMany({
    data: [
      {
        workspaceId,
        name: "Nigerian private school owners",
        industry: "Education Management",
        location: "Nigeria",
        companySize: "11-200",
        titles: ["Proprietor", "School Owner", "Head of School", "Administrator"],
        pains: [
          "Collecting school fees on time is a recurring nightmare, disrupting cash flow every term.",
          "Administrative tasks — timetables, results, communication with parents — eat up time that should go to school improvement.",
        ],
        goals: ["Predictable fee collection", "Less admin, more teaching quality"],
        objections: ["We already use spreadsheets", "Too expensive"],
      },
      {
        workspaceId,
        name: "US B2B SaaS founders",
        industry: "Software",
        location: "United States",
        companySize: "11-200",
        titles: ["CEO", "Founder", "VP of Sales", "Head of Growth"],
        pains: ["Pipeline depends on referrals and founder-led sales.", "Hiring SDRs is slow and expensive."],
        goals: ["20+ qualified demos per month", "Predictable pipeline"],
        objections: ["Cold email is spammy", "We tried an agency before"],
      },
    ],
  });
  await db.offer.createMany({
    data: [
      {
        workspaceId,
        name: "Done-For-You School OS",
        pricing: "₦2,000,000 one-time setup + ₦60,000/term support",
        valueProp: "We build, brand, and hand over your complete school management system in 1 week — so you collect fees on time and stop drowning in admin",
        proof: "40+ Nigerian schools onboarded",
        cta: "Book a call",
      },
      {
        workspaceId,
        name: "Outbound Engine Retainer",
        pricing: "$3,500/month",
        valueProp: "We book 15–25 qualified meetings a month with done-for-you outbound, without you hiring SDRs",
        proof: "$340k pipeline added for a 20-person SaaS in 60 days",
        cta: "Worth a 15-minute chat next week?",
      },
    ],
  });

  // ── Domains, inboxes, warmup ─────────────────────────────────────────
  const domainSpecs = [
    { domain: "trystabo.com", state: "ACTIVE" as const, inboxes: 3, age: 60 },
    { domain: "getstabo.co", state: "ACTIVE" as const, inboxes: 3, age: 45 },
    { domain: "stabomail.com", state: "ACTIVE" as const, inboxes: 2, age: 30 },
    { domain: "stabo-hq.io", state: "VERIFYING" as const, inboxes: 1, age: 3 },
    { domain: "outreach-broken.net", state: "ISSUE" as const, inboxes: 1, age: 20 },
  ];
  const people = [
    ["nicholas", "Nicholas Lawrence"],
    ["nick", "Nick Onumara"],
    ["n.lawrence", "Nicholas Lawrence"],
  ];
  const inboxes: { id: string; email: string; dailyLimit: number }[] = [];
  for (const [di, d] of domainSpecs.entries()) {
    const token = `demo${di}${Math.floor(r() * 1e8).toString(36)}`;
    const recs = requiredRecords(d.domain, token);
    const recStatus = (kind: string) =>
      d.state === "ACTIVE" ? "VALID" : d.state === "ISSUE" ? (kind === "DMARC" ? "INVALID" : "VALID") : kind === "OWNERSHIP" ? "VALID" : "PENDING";
    const dom = await db.sendingDomain.create({
      data: {
        workspaceId,
        domain: d.domain,
        status: d.state,
        spfStatus: recStatus("SPF"),
        dkimStatus: recStatus("DKIM"),
        dmarcStatus: recStatus("DMARC"),
        mxStatus: recStatus("MX"),
        healthScore: d.state === "ACTIVE" ? 92 + di * 2 : d.state === "ISSUE" ? 54 : 0,
        reputation: d.state === "ACTIVE" ? (di === 0 ? "Excellent" : "Good") : d.state === "ISSUE" ? "At risk" : "Unknown",
        dailyCapacity: d.state === "ACTIVE" ? d.inboxes * 40 : 0,
        verificationToken: token,
        lastCheckedAt: daysAgo(0, 8),
        createdAt: daysAgo(d.age),
        records: { create: recs.map((x) => ({ ...x, status: recStatus(x.kind), lastCheckedAt: daysAgo(0, 8) })) },
      },
    });
    for (let k = 0; k < d.inboxes; k++) {
      const [local, name] = people[k % people.length];
      const warmDays = Math.max(0, d.age - 2);
      const active = d.state !== "VERIFYING";
      const inbox = await db.inbox.create({
        data: {
          workspaceId,
          domainId: dom.id,
          email: `${local}@${d.domain}`,
          displayName: name,
          provider: di % 2 === 0 ? "GOOGLE" : "MICROSOFT",
          status: d.state === "ISSUE" ? "ERROR" : "CONNECTED",
          dailyLimit: active ? 40 : 20,
          sentToday: 0,
          bounceRate: d.state === "ISSUE" ? 4.8 : Math.round(r() * 15) / 10,
          healthScore: d.state === "ACTIVE" ? 90 + Math.floor(r() * 9) : d.state === "ISSUE" ? 52 : 70,
          signature: `${name}\nGrowth Partner · Leadabo`,
          createdAt: daysAgo(d.age),
          warmup: {
            create: {
              status: d.state === "VERIFYING" ? "NOT_STARTED" : d.state === "ISSUE" ? "PAUSED" : warmDays >= 30 ? "COMPLETED" : "ACTIVE",
              startedAt: d.state === "VERIFYING" ? null : daysAgo(warmDays),
              daysActive: d.state === "VERIFYING" ? 0 : Math.min(warmDays, 45),
              currentPerDay: d.state === "VERIFYING" ? 0 : Math.min(40, 5 + warmDays * 2),
              targetPerDay: 40,
              rampIncrement: 2,
              replyRate: d.state === "VERIFYING" ? 0 : 28 + Math.floor(r() * 12),
              healthScore: d.state === "ACTIVE" ? 94 + Math.floor(r() * 5) : d.state === "ISSUE" ? 48 : 0,
            },
          },
        },
      });
      inboxes.push(inbox);
    }
  }

  // ── Sequences ────────────────────────────────────────────────────────
  const seqSaas = await db.sequence.create({
    data: {
      workspaceId,
      name: "SaaS Founder Outreach",
      description: "4-step outbound retainer pitch for B2B software founders",
      createdAt: daysAgo(32),
      steps: { create: SEQ_SAAS.map((s, i) => ({ ...s, order: i })) },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const seqAgency = await db.sequence.create({
    data: {
      workspaceId,
      name: "Agency White-label Partnership",
      description: "3-step partnership pitch for marketing agencies",
      createdAt: daysAgo(28),
      steps: { create: SEQ_AGENCY.map((s, i) => ({ ...s, order: i })) },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const seqSchools = await db.sequence.create({
    data: {
      workspaceId,
      name: "School OS — Proprietors",
      description: "Draft sequence for Nigerian private school owners",
      steps: {
        create: [
          {
            order: 0,
            delayDays: 0,
            subject: "{{first_name}}, fees at {{company_name}}",
            body: "Hi {{first_name}},\n\nMost proprietors I speak with say chasing school fees every term is exhausting — and it disrupts cash flow.\n\nWe build, brand and hand over a complete school management system in 1 week, with automated fee reminders built in. 40+ Nigerian schools already use it.\n\nOpen to a quick call this week?\n\n{{sender_name}}",
          },
          { order: 1, delayDays: 3, subject: "Re: {{first_name}}, fees at {{company_name}}", body: "Hi {{first_name}},\n\nJust bumping this up — happy to show you a 5-minute demo of how parents pay and get receipts automatically.\n\n{{sender_name}}" },
        ],
      },
    },
  });

  // ── Campaigns + 30 days of activity ──────────────────────────────────
  const sendable = (ls: typeof leads) => ls.filter((l) => l.emailStatus === "VALID" || l.emailStatus === "CATCH_ALL");
  const campaignSpecs = [
    { name: "US SaaS Founders — Q3", status: "ACTIVE" as const, seq: seqSaas, list: listRows[0], leads: sendable(seg(0)), inbox: inboxes[0], started: 26, description: "Outbound retainer offer to US B2B SaaS founders" },
    { name: "UK Agencies — White-label", status: "PAUSED" as const, seq: seqAgency, list: listRows[1], leads: sendable(seg(1)), inbox: inboxes[3], started: 20, description: "Partnership pitch to UK agency owners" },
    { name: "Healthcare Clinics Pilot", status: "COMPLETED" as const, seq: seqSaas, list: listRows[3], leads: sendable(seg(3)), inbox: inboxes[1], started: 30, description: "Pilot campaign to clinic owners" },
    { name: "African Schools — School OS", status: "DRAFT" as const, seq: seqSchools, list: listRows[2], leads: sendable(seg(2)), inbox: inboxes[6], started: 0, description: "Done-for-you School OS offer" },
  ];

  let replyIdx = 0;
  for (const spec of campaignSpecs) {
    const campaign = await db.campaign.create({
      data: {
        workspaceId,
        name: spec.name,
        description: spec.description,
        status: spec.status,
        inboxId: spec.inbox.id,
        sequenceId: spec.seq.id,
        leadListId: spec.list.id,
        dailyLimit: 40,
        timezone: "America/New_York",
        launchedAt: spec.started ? daysAgo(spec.started) : null,
        completedAt: spec.status === "COMPLETED" ? daysAgo(2) : null,
        createdAt: daysAgo(spec.started + 1),
      },
    });
    const steps = await db.sequenceStep.findMany({ where: { sequenceId: spec.seq.id }, orderBy: { order: "asc" } });

    for (const [li, lead] of spec.leads.entries()) {
      if (spec.status === "DRAFT") {
        await db.campaignLead.create({ data: { campaignId: campaign.id, leadId: lead.id, status: "QUEUED" } });
        continue;
      }
      const company = chosen.find((p) => p.email === lead.email)!.company.name;
      const vars: Record<string, string> = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        company: company,
        company_name: company,
        job_title: lead.title ?? "",
        industry: lead.industry ?? "",
        sender_name: "Nicholas",
      };
      const render = (s: string) => s.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
      const startDay = spec.status === "ACTIVE" ? spec.started - Math.floor((li * spec.started) / Math.max(1, spec.leads.length)) : spec.started - (li % 5);
      let stepReached = 0;
      let replied: (typeof REPLIES)[number] | null = null;
      let bounced = false;
      let lastEmailId: string | null = null;
      let lastSubject = "";
      const willReply = r() < 0.3;
      const replyAtStep = Math.floor(r() * 3);

      for (const [si, step] of steps.entries()) {
        const day = startDay - step.delayDays;
        if (day < 0) break;
        const sentAt = daysAgo(day, 9 + (li % 7), (li * 7) % 60);
        const isBounce = si === 0 && r() < 0.04;
        const email = await db.email.create({
          data: {
            workspaceId,
            campaignId: campaign.id,
            leadId: lead.id,
            inboxId: spec.inbox.id,
            stepId: step.id,
            subject: render(step.subject),
            body: render(step.body),
            status: isBounce ? "BOUNCED" : "DELIVERED",
            messageId: `<demo-${campaign.id}-${li}-${si}@mail.leadabo.dev>`,
            sentAt,
            createdAt: sentAt,
          },
        });
        const base = { workspaceId, emailId: email.id, campaignId: campaign.id, inboxId: spec.inbox.id };
        const ev: Prisma.EmailEventCreateManyInput[] = [
          { ...base, type: "SENT", occurredAt: sentAt },
          { ...base, type: isBounce ? "BOUNCED" : "DELIVERED", occurredAt: sentAt },
        ];
        if (!isBounce && r() < 0.62) ev.push({ ...base, type: "OPENED", occurredAt: new Date(sentAt.getTime() + (1 + r() * 20) * 3600_000) });
        if (!isBounce && r() < 0.08) ev.push({ ...base, type: "CLICKED", occurredAt: new Date(sentAt.getTime() + 22 * 3600_000) });
        await db.emailEvent.createMany({ data: ev });
        stepReached = si + 1;
        lastEmailId = email.id;
        lastSubject = email.subject;
        if (isBounce) {
          bounced = true;
          const bc = await db.conversation.create({
            data: { workspaceId, leadId: lead.id, campaignId: campaign.id, inboxId: spec.inbox.id, subject: `Undeliverable: ${email.subject}`, label: "BOUNCED", unread: false, lastMessageAt: sentAt, createdAt: sentAt },
          });
          await db.email.update({ where: { id: email.id }, data: { conversationId: bc.id } });
          break;
        }
        if (willReply && si === replyAtStep) {
          replied = REPLIES[replyIdx++ % REPLIES.length];
          const receivedAt = new Date(sentAt.getTime() + (3 + r() * 30) * 3600_000);
          const label =
            replied.category === "NEGATIVE" ? "NOT_INTERESTED" : replied.category === "MEETING_REQUEST" ? "MEETING" : replied.category === "INTERESTED" ? "INTERESTED" : "NONE";
          const convo = await db.conversation.create({
            data: {
              workspaceId,
              leadId: lead.id,
              campaignId: campaign.id,
              inboxId: spec.inbox.id,
              subject: lastSubject.startsWith("Re:") ? lastSubject : `Re: ${lastSubject}`,
              label,
              unread: r() < 0.55,
              replied: r() < 0.35,
              meetingAt: label === "MEETING" ? daysAgo(-2, 14) : null,
              lastMessageAt: receivedAt,
              createdAt: receivedAt,
            },
          });
          await db.email.updateMany({ where: { campaignId: campaign.id, leadId: lead.id }, data: { conversationId: convo.id } });
          await db.reply.create({
            data: {
              workspaceId,
              conversationId: convo.id,
              leadId: lead.id,
              campaignId: campaign.id,
              emailId: email.id,
              body: replied.body,
              category: replied.category,
              aiConfidence: 0.72 + r() * 0.26,
              suggestedResponse: SUGGESTED[replied.category]?.replace("{{first_name}}", lead.firstName) ?? null,
              handled: convo.replied,
              receivedAt,
            },
          });
          await db.emailEvent.create({ data: { ...base, type: "REPLIED", occurredAt: receivedAt } });
          await db.lead.update({ where: { id: lead.id }, data: { lastRepliedAt: receivedAt, lastContactedAt: sentAt } });
          await db.leadActivity.create({ data: { leadId: lead.id, type: "replied", description: `Replied (${replied.category.replace(/_/g, " ").toLowerCase()})`, createdAt: receivedAt } });
          break;
        }
        await db.lead.update({ where: { id: lead.id }, data: { lastContactedAt: sentAt } });
      }
      void lastEmailId;
      const done = stepReached >= steps.length;
      const status = bounced ? "BOUNCED" : replied && replied.category !== "OUT_OF_OFFICE" ? "REPLIED" : spec.status === "COMPLETED" || done ? "COMPLETED" : "IN_SEQUENCE";
      const nextStep = steps[stepReached];
      await db.campaignLead.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          status,
          currentStep: stepReached,
          nextSendAt: status === "IN_SEQUENCE" && nextStep ? daysAgo(startDay - nextStep.delayDays, 9 + (li % 7)) : null,
          addedAt: daysAgo(spec.started + 1),
        },
      });
      if (stepReached > 0) {
        await db.leadActivity.create({
          data: { leadId: lead.id, type: "campaign", description: `Added to campaign “${spec.name}”`, createdAt: daysAgo(spec.started + 1) },
        });
      }
    }
  }

  // ── Credits, verification runs, notifications, API key ──────────────
  const txns: Prisma.CreditTransactionCreateManyInput[] = [];
  let bal = 25_000;
  txns.push({ workspaceId, amount: 25_000, category: "PLAN_GRANT", description: "Growth plan monthly credits", balanceAfter: bal, createdAt: daysAgo(34) });
  const usage: [number, "LEAD_DISCOVERY" | "EMAIL_VERIFICATION" | "AI_GENERATION", number, string][] = [
    [33, "LEAD_DISCOVERY", 20, "Revealed 20 leads — US SaaS founders"],
    [32, "EMAIL_VERIFICATION", 20, "Verified 20 emails"],
    [30, "LEAD_DISCOVERY", 20, "Revealed 20 leads — UK agencies"],
    [29, "EMAIL_VERIFICATION", 20, "Verified 20 emails"],
    [27, "AI_GENERATION", 2, "AI: generate email"],
    [22, "LEAD_DISCOVERY", 16, "Revealed 16 leads — African schools"],
    [21, "EMAIL_VERIFICATION", 16, "Verified 16 emails"],
    [14, "AI_GENERATION", 2, "AI: personalize"],
    [12, "LEAD_DISCOVERY", 5_127, "Bulk enrichment of CRM contacts"],
    [9, "LEAD_DISCOVERY", 16, "Revealed 16 leads — Healthcare"],
    [3, "AI_GENERATION", 2, "AI: subject lines"],
  ];
  for (const [d, cat, amt, desc] of usage) {
    bal -= amt;
    txns.push({ workspaceId, amount: -amt, category: cat, description: desc, balanceAfter: bal, createdAt: daysAgo(d) });
  }
  await db.creditTransaction.createMany({ data: txns });
  await db.creditBalance.upsert({
    where: { workspaceId },
    create: { workspaceId, balance: bal, monthlyCredits: 5_000, lifetimeCredits: 25_000 },
    update: { balance: bal, monthlyCredits: 5_000, lifetimeCredits: 25_000 },
  });

  await db.verificationRun.createMany({
    data: [
      { workspaceId, label: "US SaaS Founders", total: 24, processed: 24, valid: 17, invalid: 1, risky: 1, unknown: 0, catchAll: 3, status: "COMPLETED", createdAt: daysAgo(32), completedAt: daysAgo(32) },
      { workspaceId, label: "UK Marketing Agencies", total: 14, processed: 14, valid: 10, invalid: 1, risky: 1, unknown: 0, catchAll: 2, status: "COMPLETED", createdAt: daysAgo(29), completedAt: daysAgo(29) },
    ],
  });

  await db.notification.createMany({
    data: [
      { workspaceId, type: "POSITIVE_REPLY", title: "Positive reply from a SaaS founder", body: "“Can you do Thursday at 2pm? Send me a calendar invite.”", href: "/outreach/inbox?folder=meeting", createdAt: daysAgo(0, 9) },
      { workspaceId, type: "DOMAIN_ISSUE", title: "DNS issue on outreach-broken.net", body: "DMARC record failed validation. Sending from this domain is paused.", href: "/settings/infrastructure/domains", createdAt: daysAgo(1, 15) },
      { workspaceId, type: "BOUNCE_SPIKE", title: "Bounce spike detected", body: "nicholas@outreach-broken.net hit a 4.8% bounce rate in the last 24h.", href: "/settings/infrastructure/inboxes", createdAt: daysAgo(1, 16) },
      { workspaceId, type: "CAMPAIGN_COMPLETED", title: "Healthcare Clinics Pilot completed", body: "Every lead has finished the sequence. Review results and replies.", href: "/outreach/campaigns", createdAt: daysAgo(2, 11), readAt: daysAgo(2, 12) },
      { workspaceId, type: "VERIFICATION_COMPLETED", title: "Verification completed", body: "14 emails verified — 10 valid, 2 catch-all, 1 risky, 1 invalid.", href: "/leadgen/verify", createdAt: daysAgo(29), readAt: daysAgo(29) },
      { workspaceId, type: "CAMPAIGN_LAUNCHED", title: "US SaaS Founders — Q3 is live", body: "Sending to verified leads from nicholas@trystabo.com.", href: "/outreach/campaigns", createdAt: daysAgo(26), readAt: daysAgo(26) },
      { workspaceId, userId: ownerId, type: "ACADEMY_MILESTONE", title: "Day 3 complete 🎉", body: "You finished “Build Your ICP & Offer”. Day 4: Email Infrastructure is unlocked.", href: "/academy", createdAt: daysAgo(3), readAt: null },
    ],
  });
}
