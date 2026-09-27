# Plan: "start and finish on Leadabo" (done-for-you domains & inboxes)

This is a planning document only — nothing here is implemented. It exists so you can pick a
vendor and a risk level before any code or money is committed, per the closed-loop model Leadash
appears to use (buy a domain, get a hosted/rotated inbox, all inside their product).

## Where Leadabo stands today

Confirmed by reading the schema and provider code directly:

- `SendingDomain` — verify-only. A user types in a domain they already own; Leadabo shows the DNS
  records to add (SPF/DKIM/DMARC/MX/ownership) and checks them. We never register or hold a
  domain.
- `Inbox` — connect-only. A user pastes credentials for a mailbox they already have (Gmail app
  password, Microsoft 365, or generic SMTP/IMAP). We never provision, host, or sell a mailbox.

Net: **zero infrastructure COGS today**, because we host nothing. That's also exactly the gap: a
user can't start and finish entirely inside Leadabo the way the screenshot shows Leadash working —
they have to go elsewhere to buy a domain and set up a mailbox first.

## What "done-for-you" requires, concretely

Two new integrations, each a real vendor relationship with ongoing cost and risk — not a UI
change:

### 1. Domain registration

- We'd need a registrar or registrar-reseller account with a programmatic API (buy a domain on the
  customer's behalf, auto-configure the DNS records we already know how to verify, handle
  renewal/expiry).
- Real cost: domain registration typically runs a few dollars to ~$15/year depending on TLD;
  "throwaway" cold-email sending domains commonly use cheaper alternative TLDs precisely to keep
  this cost down. Reseller accounts often require an upfront deposit or minimum commitment.
- Risk: we become the registrant of record (or at least the reseller managing it), so *we* absorb
  renewal, abuse/compliance (ICANN WHOIS accuracy rules), and refund exposure if a customer cancels
  and wants the domain released or transferred.

### 2. Mailbox hosting

- We'd need either (a) our own bulk Google Workspace or Microsoft 365 reseller relationship, or
  (b) a wholesale mailbox provider built for cold-email infrastructure (there are several; exact
  current pricing needs a live quote — see Caveats).
- Real cost: bulk mailbox hosting commonly runs somewhere in the $1.50–$6/mailbox/month range
  depending on the provider and volume tier. This is the single biggest new COGS line if we go this
  route, and it's recurring for as long as the customer keeps the inbox — unlike lead credits,
  which are a one-time spend per action.
- Risk: mailbox reputation and deliverability become partly *our* operational problem (warmup,
  abuse complaints, provider suspensions), not just something we advise the customer on.

## Data model sketch (not built)

If you decide to proceed, the shape would likely be:

- `DomainOrder` — workspace, requested domain/TLD, registrar order id, status (pending/registered/
  failed/expiring), renewal date, price charged.
- `Inbox` gains a `provisioned: boolean` + `hostingOrderId` so a done-for-you inbox and a BYO inbox
  share the same downstream code (campaign engine, warmup, etc. don't need to know which kind it
  is) — everything after the credentials exist already works unchanged.
- A recurring-cost problem our current billing model doesn't handle yet: `Payment`/`Subscription`
  today are prepaid, one-time-per-period charges. A per-domain/per-inbox monthly add-on is a
  **metered, incrementally-billed** line item (add an inbox mid-period → prorate the difference),
  which needs new billing logic, not just new inventory.

## Suggested phased approach

1. **Get real vendor quotes first.** Everything above is a public-pricing-page estimate, not a
   quote — actual bulk/reseller rates are usually only available by talking to sales, and often
   depend on expected volume.
2. **Phase 1 (manual/semi-automated):** take domain/inbox requests through Leadabo's UI, fulfill
   them by hand (or with a lightweight internal tool) against a chosen vendor, while the real
   provisioning API is built. Validates demand and real per-unit cost before investing in
   automation.
3. **Phase 2 (automated):** wire the registrar and mailbox-hosting APIs directly into `SendingDomain`
   and `Inbox` creation, with the metered billing add-on described above.

## Decisions only you can make before this starts

- Which registrar/reseller and which mailbox-hosting provider (or whether to resell Google
  Workspace/Microsoft 365 seats ourselves) — I can evaluate specific vendors once you name
  candidates, or research options if you want a shortlist.
- Risk appetite for holding domain/mailbox inventory and the refund/cancellation exposure that
  comes with it.
- Target markup/margin on the add-on (mirrors the `docs/PRICING-MARGIN-NOTES.md` exercise, but for
  a recurring hosting cost instead of a per-action API cost).
- Whether this should be a mandatory part of every plan or an optional add-on next to the existing
  BYO connect flow (BYO costs us nothing and some customers will always prefer their own Google
  Workspace account).

## Caveats

I could not reach `leadash.com` from this environment (their domain is blocked by the network
egress proxy here) and could not find their current published pricing via search, so I have no
verified figure for what they actually pay per domain or per inbox — the ranges above are general
published/typical figures for the categories involved, not a quote from any specific vendor, and
should be treated as a starting point for vendor conversations, not a number to price against.
