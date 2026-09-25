# Leadstabo — Build your outbound engine.

Leadstabo is an all-in-one outbound acquisition platform: define your ICP, find and verify leads, set up sending infrastructure, write personalized sequences, launch campaigns, handle replies and learn the whole system in the built-in Academy.

```
ICP → Find Leads → Verify → Create Offer → Personalize → Write Email → Build Sequence → Send → Track → Follow Up → Convert
```

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS, Radix primitives (shadcn-style components), lucide icons, Recharts, cmdk, sonner |
| Data | PostgreSQL + Prisma ORM |
| Auth | Email/password with bcrypt, DB-backed sessions (httpOnly cookie), optional TOTP 2FA |
| Jobs | `scripts/worker.ts` polling worker, or `POST /api/cron/tick` for serverless schedulers |
| Integrations | SMTP/IMAP (nodemailer, imapflow), Apollo.io, ZeroBounce, Stripe, Claude (`@anthropic-ai/sdk`) |

## Getting started

```bash
cp .env.example .env            # set DATABASE_URL and a 32+ char APP_SECRET
npm install                     # also runs `prisma generate`
npx prisma migrate deploy       # or: npm run db:migrate
npm run db:seed                 # plans, academy, demo workspace
npm run dev                     # http://localhost:3000
npm run worker                  # in a second terminal: sends campaigns, ramps warmup
```

**Demo login:** `demo@leadstabo.com` / `leadstabo123` (owner). `sarah@leadstabo.com` (admin) and `tunde@leadstabo.com` (member) use the same password. A second workspace (`owner@acme.test`) exists to demonstrate tenant isolation.

New sign-ups get an empty Starter workspace with 500 credits. They can use **Load sample data** on the dashboard or onboarding screen to explore a populated workspace.

## What’s inside

- **Dashboard**: KPIs with week-over-week trends, 30-day activity chart, lead pipeline funnel, recent campaigns and replies, infrastructure health, domain status, weekly volume.
- **Leadgen**
  - *Find Leads*: 400M+ contact database (mock), 12 filter groups, AI natural-language filter, people/company views, bulk add-to-list, verify, export, and credit-metered reveals.
  - *All Leads / Lead Lists*: search, sort, filter, bulk actions, CSV export, rename/duplicate/delete lists.
  - *Lead profile*: contact and company info, technologies, notes, activity timeline, campaign membership, conversations.
  - *Verify Email*: status breakdown (valid / invalid / risky / unknown / catch-all), CSV upload with optional verification, verify all or selected, run history.
- **Outreach**
  - *Campaigns*: status tabs, per-campaign funnel, 7-step creation wizard (details → leads → inbox & sending window → write → sequence → review → launch), detail page with step performance, enrolled leads, settings, pause/resume/complete, "send due now".
  - *Sequences*: visual builder (add, delete, duplicate, reorder, delay, enable/disable, preview).
  - *Composer*: variables with fallbacks, rich/plain text, live preview with real lead data, AI assist (generate, improve, shorten, personalize, subject lines, rewrite CTA, follow-up), CTA insertion, signature, spam-risk score, word/char count.
  - *Inbox*: folders, threaded conversations, AI suggested replies, labels, archive, notes, add to campaign, book meeting, j/k navigation.
  - *Replies*: AI-classified categories with confidence, suggested responses, reclassify, mark handled.
  - *ICPs & Offers*: saved ICPs and offers feed the AI writer.
- **Settings**: profile, appearance (dark/light/system), security (password, TOTP 2FA, sessions), team (invites, roles, permission matrix), billing & plans (monthly/annual, comparison, usage, credit packs, credit history), outreach defaults, API keys.
  - *Infrastructure*: sending domains (6-step DNS setup with SPF/DKIM/DMARC/MX checks), inboxes (Google, Microsoft, SMTP; encrypted credentials), warmup (start/pause/configure, ramp progress).
- **Academy**: *Leadstabo Outbound Acquisition* (Days 1–7, 21 lessons) plus two shorter courses. Includes a presentation-style lesson player, autosaving notes, resources, progress, streaks and certificates.
- **Also**: analytics (campaign, inbox, domain, lead), ⌘K global search, notification center, help center, public landing page with pricing.

## Architecture

```
prisma/schema.prisma         data model (all tenant rows carry workspaceId)
prisma/seed.ts               plans, academy, demo users & workspaces
src/config/                  plan catalogue & academy curriculum (seeded into DB)
src/lib/auth/                sessions, guards (requireWorkspace / assertWorkspace), roles, TOTP
src/lib/providers/           provider interfaces + mock implementations + Claude adapter
src/lib/services/            campaign engine, analytics, credits, domains, warmup, personalization, spam scoring
src/server/actions/          server actions (zod-validated, role-checked, workspace-scoped)
src/app/(app)/               authenticated product
src/app/api/                 search, CSV export, cron tick, REST API v1
scripts/worker.ts            background worker
```

### Real services

Every external capability sits behind an interface in `src/lib/providers/types.ts`. The registry in `src/lib/providers/index.ts` uses the real provider whenever it can run. **Settings → Integrations** shows what's live.

| Capability | Real provider | Needs | Without a key |
| --- | --- | --- | --- |
| Email sending | Each inbox's own mailbox over **SMTP** (nodemailer) | Connect inboxes with an app password | — (always real) |
| Replies & bounces | **IMAP** sync (imapflow + mailparser), matched by `In-Reply-To`/`References`, DSN bounce parsing | Worker or cron running | — |
| Open / click tracking | Pixel `/api/t/o/:id`, signed redirects `/api/t/c/:id` | Public `APP_URL` | Not recorded on localhost |
| DNS checks | Live DNS (SPF, DKIM selectors, DMARC, MX, ownership TXT) with a DNS-over-HTTPS fallback | — | — (always real) |
| Email verification | **ZeroBounce** mailbox-level checks | `ZEROBOUNCE_API_KEY` | Live syntax / disposable / MX checks |
| Lead database | **Apollo.io** People Search + bulk enrichment | `APOLLO_API_KEY` | Built-in demo dataset |
| Payments | **Stripe Checkout** + webhook `/api/webhooks/stripe` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Instant test-mode plan changes |
| AI | **Claude** (`@anthropic-ai/sdk`) | `ANTHROPIC_API_KEY` | Templates |

Set `<CAPABILITY>_PROVIDER=mock` (e.g. `EMAIL_PROVIDER=mock`) to force the offline simulation for local demos.

**Connecting inboxes:**
- **Google Workspace:** turn on 2-Step Verification, create an app password at myaccount.google.com/apppasswords, and enable IMAP.
- **Microsoft 365:** enable Authenticated SMTP for the mailbox.
- **Anything else:** enter SMTP and IMAP hosts.

Seeded demo inboxes have no credentials, so they never send. Connect a real inbox and point a campaign at it.

**Stripe:** create a webhook endpoint for `https://<APP_URL>/api/webhooks/stripe` with the events `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` and `customer.subscription.deleted`. Prices come from the `Plan` table, so no Stripe products need to be created by hand. For local testing, use `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

### Background sending

`processDueSends()` finds due `CampaignLead`s and enforces each campaign's send window, timezone and weekend setting, plus the campaign and inbox daily limits. It then renders variables, sends through the provider, records `Email` and `EmailEvent`s, and schedules the next step. Replies stop the sequence. It also recomputes each inbox's bounce rate and auto-pauses an inbox (with a notification) above the workspace threshold. `advanceWarmups()` ramps warmup volume once per day.

- Long-running: `npm run worker` (sends, IMAP reply/bounce sync every 3 ticks, warmup)
- Serverless: `POST /api/cron/tick` with `Authorization: Bearer $CRON_SECRET`

## Security

- **Workspace isolation**: the active workspace is derived server-side from membership (`getWorkspaceContext`). Every query filters by that `workspaceId`, never by client input.
- **Authorization**: roles (Owner > Admin > Member > Viewer) are checked in every server action and route.
- **Validation**: zod on every action and API route; control-character stripping; CSV export neutralises formula injection.
- **Secrets**: inbox credentials and 2FA secrets are AES-256-GCM encrypted (key derived from `APP_SECRET`). API keys and session tokens are stored only as SHA-256 hashes. Provider keys stay server-side.
- **Rate limiting**: login, signup, search, AI and the public API (in-memory; swap for Redis when running multiple instances).
- **Other**: bcrypt passwords with timing-safe login, httpOnly/SameSite session cookies, security headers, middleware gate plus server-side checks.

## REST API

Create a key in **Settings → API Keys**, then:

```bash
curl http://localhost:3000/api/v1/leads?limit=25 -H "Authorization: Bearer lsk_live_…"
curl -X POST http://localhost:3000/api/v1/leads -H "Authorization: Bearer lsk_live_…" \
  -H "Content-Type: application/json" -d '{"email":"ada@acme.com","firstName":"Ada","company":"Acme"}'
curl http://localhost:3000/api/v1/campaigns -H "Authorization: Bearer lsk_live_…"
curl http://localhost:3000/api/v1/lists -H "Authorization: Bearer lsk_live_…"
```

`GET/DELETE /api/v1/leads/:id` is also available. Responses are workspace-scoped; limit is 120 requests/minute per key.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:migrate` / `db:seed` / `db:reset` | Prisma |
| `npm run worker` | background sender & warmup |
