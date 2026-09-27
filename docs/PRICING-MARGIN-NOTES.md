# Pricing & margin notes (Growth / Scale, September 2026)

Why Growth and Scale changed price, and the reasoning behind the new numbers. Starter and
Enterprise were untouched.

## The problem

Every plan grants a pool of credits (`leadCredits`) spent on three things:

| Credit action | Cost to us | Source |
|---|---|---|
| Lead reveal (1 credit) | ~$0.03–$0.06 | Apollo export credits (their published per-credit rate at low/mid plan tiers) |
| Verification (1 credit) | ~$0.005–$0.02 | ZeroBounce pay-as-you-go rate, volume-dependent |
| AI generation (2 credits) | ~$0.02/call ≈ $0.01/credit | Claude Opus 5 API, ~1,000 input + 600 output tokens |
| Email send (0 credits) | $0 | Sent through the customer's own mailbox — no cost to us |

Lead reveals are the expensive action, and also the core value prop (finding leads), so a
workspace realistically can and does spend most of its monthly credits there.

Comparing that to what a credit sold for:

| Plan | Old price/credits | Old $/credit | Apollo floor ($0.03) |
|---|---|---|---|
| Starter | $39 / 500 | **$0.078** | ✅ fine |
| Growth | $99 / 5,000 | **$0.0198** | ❌ below cost |
| Scale | $249 / 20,000 | **$0.01245** | ❌ well below cost |

Growth and Scale were selling a credit for *less than a single lead reveal could cost us*, so a
workspace that used its full allowance on lead reveals (exactly the plan's core use case) lost us
money before counting payment fees, support, or infrastructure.

## The fix

Kept `LEAD_REVEAL` at 1 credit (no change to how credits are spent — see
`src/lib/services/credits.ts`). Instead, raised price and trimmed the monthly credit allowance on
Growth and Scale so the worst case (100% of credits spent on lead reveals) clears real margin even
at the higher end of Apollo's per-credit range:

| Plan | New price/credits | New $/credit |
|---|---|---|
| Growth | $129 / 4,000 | **$0.0323** |
| Scale | $349 / 12,000 | **$0.0291** |

Both now sit safely above the $0.03 floor. Verification- and AI-heavy usage is comfortably
profitable at every tier already, since those cost far less per credit than a lead reveal.

`monthlySends`, `inboxLimit` and `teamMembers` were left unchanged — those aren't tied to a paid
third-party API cost (SMTP sending is free, through the customer's own mailbox; DNS checks are
free), so they carry no COGS risk.

## Caveats — re-check before relying on this

- Apollo and ZeroBounce per-credit costs above come from their currently published pricing pages,
  not a live account quote. Real cost depends on which plan tier we buy in bulk at, and any
  negotiated/annual discount can move the Apollo floor down (helping margin further) or a change in
  their pricing can move it up (eroding it again).
- This has no usage telemetry behind it — we don't yet know the real mix of lead-reveal vs.
  verification vs. AI-generation spend per workspace. The $0.03 floor was chosen to survive the
  worst case (100% lead reveals), which is conservative by design; once we have usage data, we
  could tune price/allowance more precisely instead of assuming the worst case.
- This only affects **new** subscriptions and **renewals** going forward (`applyPlan` recomputes
  the price at each checkout) — nobody currently mid-period is retroactively charged more.
- Prices are edited in one place, `src/config/plans.ts` (see the comment at the top of that file);
  changing a number there and running `npm run db:seed` is enough to push a new price.
