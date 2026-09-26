# How to connect every Leadabo service (the super-simple guide)

Think of Leadabo like a toy robot. It works out of the box, but it only does the *real*
magic when you plug in its batteries. Each "battery" is a secret key from another company.
You write each key into a special file called **`.env`**, and Leadabo reads it when it starts.

> Leadabo is a product of **Numi Innovations LTD**. When a payment company asks for your business
> name or documents (Steps 10a–10c), register it as Numi Innovations LTD.

> **Golden rules**
> 1. A key is like a house key. Never post it in chat, on GitHub, or in a screenshot.
> 2. `.env` lives **only** on your computer and your server. It is never uploaded to GitHub, and it is **not inside the zip you download** — so every time you download a fresh copy, copy your `.env` into the new folder.
> 3. After changing `.env`, stop the app (Ctrl + C) and start it again.
> 4. **The school database is sacred.** Leadabo has its *own* database. Never run `npm run db:reset` or `prisma migrate reset` unless you are 100% sure you're pointing at the Leadabo database.

You can always check what's plugged in at **Settings → Integrations**. Green "Live" = battery in. Yellow "Demo" = no battery yet.

---

## Step 0 — Open the right folder and make the `.env` file

1. Open the Leadabo folder (the one with `package.json` inside).
2. Is there a file called `.env`? If **no**:
   - If you had one in an older download, copy it into this folder:
     ```
     copy "C:\path\to\old\leadabo-folder\.env" .env
     ```
   - Otherwise copy the example: `copy .env.example .env`
3. Open `.env` with Notepad. You'll fill it in as you go through this guide.

---

## Step 1 — The database (Leadabo's notebook)

Leadabo writes everything (users, leads, campaigns) into a Postgres database. You already
made one on **Neon** called `leadstabo`. (It keeps that old name — that's fine, and renaming it isn't needed.)

1. Go to <https://console.neon.tech> and open your project.
2. Click **Connect**. Pick the database **`leadstabo`** (not `neondb` — that's the school's!).
3. Turn **off** "Connection pooling" so the address has **no** `-pooler` in it.
4. Copy the address. Put it in `.env`:
   ```
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-lucky-darkness-b47z92c8.c-6.us-east-2.aws.neon.tech/leadstabo?sslmode=require&connect_timeout=30"
   ```
   (`connect_timeout=30` gives Neon time to wake up — on the free plan the database falls asleep
   after 5 minutes of no use.)
5. **Very important on your Windows PC:** your computer has an old setting that points at the
   school database. In **every new** Command Prompt window, type this first:
   ```
   set DATABASE_URL=
   ```
   (Nothing after the `=`.) This tells Windows "forget the school one, use the `.env` file".
6. Now build the notebook's pages:
   ```
   npm install
   npx prisma migrate deploy
   npm run db:seed
   ```
   ✅ You should see "All migrations have been successfully applied" and "Seed complete".

> If you see `Environment variable not found: DATABASE_URL` → there's no `.env` in this folder (go back to Step 0).
> If you see **"Can't reach database server at ep-lucky-darkness…"** → Leadabo can't reach Neon:
> 1. Check your internet connection.
> 2. Open <https://console.neon.tech> → your project. If it says the compute is **suspended** or you've
>    used up your free **compute hours**, wake it or upgrade the plan.
> 3. Make sure `connect_timeout=30` is at the end of your `DATABASE_URL`, stop the app (Ctrl + C), run
>    `set DATABASE_URL=` and `npm run dev` again.
> If you see anything mentioning `ep-soft-truth` or `neondb` → STOP, you forgot `set DATABASE_URL=`.

---

## Step 2 — `APP_SECRET` (Leadabo's diary lock)

This secret locks up saved mailbox passwords and signs links.

1. In Command Prompt run:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Copy the jumble of letters it prints into `.env`:
   ```
   APP_SECRET="the-jumble-you-copied"
   ```
3. Never change it later — if you do, every connected inbox must be connected again.

Also set a password for the timer door (used in Step 4):
```
CRON_SECRET="any-long-random-words-you-like"
```

---

## Step 3 — Put Leadabo on the internet (`APP_URL`)

On your PC Leadabo lives at `http://localhost:3000`. That's like a house with no street
address — Paystack can't send you a "they paid!" letter, and email opens/clicks can't be counted.
For real use you need a public address.

Easiest way (**Railway** or **Render**, both work the same way):

1. Push your code to GitHub (it already is).
2. Make an account at <https://railway.app> (or <https://render.com>), click **New Project → Deploy from GitHub**, pick `leadstabo`.
3. In the service's **Variables** tab, add every line from your `.env` (DATABASE_URL, APP_SECRET, CRON_SECRET and all the keys below).
4. Build command: `npm install && npm run build` · Start command: `npm start`.
5. Railway/Render gives you an address like `https://leadabo-production.up.railway.app`
   (you can later add your own like `https://app.leadabo.com`). Put it in the variables:
   ```
   APP_URL="https://leadabo-production.up.railway.app"
   ```
6. Run the database step once from your PC (Step 1) — the online app uses the same Neon database.

---

## Step 4 — The worker (the postman who sends emails)

Campaign emails don't send themselves. A little helper program called the **worker** wakes up
every minute: it sends due emails, reads replies and bounces, grows warmup, and checks who needs
to renew their plan.

- **On your PC:** open a *second* Command Prompt in the same folder:
  ```
  set DATABASE_URL=
  npm run worker
  ```
  Leave it open.
- **On Railway/Render:** add a second service from the same repo with start command
  `npm run worker` and the same variables.
- **Or, no worker at all:** use a free timer like <https://cron-job.org> to call
  `https://YOUR-APP-URL/api/cron/tick` every minute, method **POST**, with a header
  `Authorization: Bearer YOUR_CRON_SECRET`.

---

## Step 5 — Connect sending inboxes (the mouths that speak)

Leadabo sends from *your* real mailboxes. Go to **Settings → Sending Inboxes → Connect inbox**.
Leadabo tests both sending (SMTP) and reply-reading (IMAP) before it saves anything.

### 5a. Google Workspace / Gmail (recommended)
1. Go to <https://myaccount.google.com/security> while logged into that mailbox.
2. Turn on **2-Step Verification** (Google won't give app passwords without it).
3. Go to <https://myaccount.google.com/apppasswords>. Type a name like "Leadabo" and click **Create**.
4. Google shows a 16-letter password like `abcd efgh ijkl mnop`. Copy it (spaces are fine).
5. In Gmail → ⚙️ → **See all settings → Forwarding and POP/IMAP**: if you see an IMAP switch, turn it **on**.
6. In Leadabo pick **Google**, type the email and paste the app password → **Connect**.
   > Company Google Workspace? If "App passwords" is missing, your Google admin must allow
   > 2-Step Verification for users (Admin console → Security → Authentication).

### 5b. Microsoft 365 / Outlook
1. A Microsoft 365 admin opens <https://admin.microsoft.com> → **Users → Active users** → click the user → **Mail → Manage email apps** → tick **Authenticated SMTP** and **IMAP** → Save.
2. In Leadabo pick **Microsoft 365**, type the email and password.
   > ⚠️ Honest warning: Microsoft has switched off password logins for IMAP on most accounts
   > (and is doing the same for SMTP). If Leadabo says "IMAP: authentication failed", that's
   > Microsoft refusing — use a Google Workspace or "Other" mailbox instead.

### 5c. Any other mailbox (Zoho, Namecheap Private Email, cPanel, etc.)
1. Find your provider's "SMTP and IMAP settings" help page. Example for Zoho:
   SMTP `smtp.zoho.com` port `465`, IMAP `imap.zoho.com` port `993`.
2. If the provider offers "app passwords", make one and use it.
3. In Leadabo pick **Other (SMTP)** and fill in the hosts, ports, username and password.

✅ After connecting, click **Sync now** on the inbox — no red error means replies will flow in.

> The demo inboxes that came with the sample data have no passwords, so they never send. Point
> your campaigns at a real connected inbox.

---

## Step 6 — Sending domains (the name tag that proves it's really you)

Without these, your emails go to spam. Go to **Settings → Sending Domains → Add domain**.
Leadabo shows you 5 records. You copy each one into the place where you bought your domain
(Namecheap, GoDaddy, Cloudflare, Whogohost…) under **DNS** or **Advanced DNS**.

| Record | What it's like | Type |
| --- | --- | --- |
| Ownership | "This domain is mine" note | TXT |
| SPF | List of who may post letters for you | TXT on `@` |
| DKIM | Your wax seal on every letter | TXT (from Google/Microsoft admin) |
| DMARC | Rules for fake letters | TXT on `_dmarc` |
| MX | Where your replies get delivered | MX |

For **DKIM on Google Workspace**: admin.google.com → Apps → Google Workspace → Gmail →
**Authenticate email** → Generate new record → copy the TXT into your DNS → click **Start authentication**.

Then click **Verify DNS** in Leadabo. DNS can take from 5 minutes to a few hours to update —
if something is red, wait and try again. All green = ready to send.

---

## Step 7 — ZeroBounce (the email checker)

Checks if an email address really exists before you send to it.

1. Sign up at <https://www.zerobounce.net> (you get free credits to try).
2. Go to **API → API Keys** and copy your key.
3. In `.env`: `ZEROBOUNCE_API_KEY="your-key"`.

Without it Leadabo still checks spelling, throwaway domains and whether the domain accepts mail.

---

## Step 8 — Apollo (the phone book of 200M+ people)

1. Sign up at <https://www.apollo.io>. **You need a plan that includes API access.**
2. Go to **Settings → Integrations → API** (or <https://app.apollo.io/#/settings/integrations/api>) → **Create new key**.
   Tick the "master key" / all-endpoints option so search and enrichment both work.
3. In `.env`: `APOLLO_API_KEY="your-key"`.

Searching is free; revealing a person's email uses Apollo credits plus 1 Leadabo credit.

---

## Step 9 — Claude AI (the writing helper)

1. Go to <https://console.anthropic.com>, sign up and add a little billing credit.
2. **API Keys → Create Key**, copy it (starts with `sk-ant-`).
3. In `.env`: `ANTHROPIC_API_KEY="sk-ant-..."`.

Now "Write with AI", reply suggestions and reply sorting use Claude instead of templates.

---

## Step 10 — Getting paid in Naira ₦ or Dollars $ (Paystack, Flutterwave, Korapay)

Your customers choose **Naira or Dollars** on the pricing page and in **Settings → Billing & Plans**,
then choose which payment company to pay with. You can connect one, two or all three.

**How it works (like a shop):** the customer picks a plan → Leadabo writes a receipt with the
price → the customer pays on Paystack/Flutterwave/Korapay's own safe page → Leadabo phones the
payment company to double-check "did they really pay the right amount?" → only then the plan or
credits are switched on. Plans are prepaid for 1 or 12 months and don't auto-charge — customers
get a reminder 5 days before, and a 7-day grace period after.

> **Test first!** Every company gives you *test keys* (fake money). Use them until everything
> works, then swap to *live keys*. Live keys need your business verified (CAC documents, bank account).

### 10a. Paystack
1. Sign up at <https://dashboard.paystack.com>.
2. Click **Settings → API Keys & Webhooks**.
3. Copy the **Test Secret Key** (`sk_test_...`) into `.env`:
   ```
   PAYSTACK_SECRET_KEY="sk_test_..."
   ```
4. In the same page, set **Test Webhook URL** to:
   `https://YOUR-APP-URL/api/webhooks/paystack`
5. Dollars: Paystack only takes USD if your account has USD enabled (ask Paystack support). If yours
   doesn't, add `PAYSTACK_CURRENCIES="NGN"` so it's only offered for Naira.

### 10b. Flutterwave
1. Sign up at <https://app.flutterwave.com>.
2. **Settings → API Keys**: copy the **Secret Key** (`FLWSECK_TEST-...`).
3. **Settings → Webhooks**: URL = `https://YOUR-APP-URL/api/webhooks/flutterwave`.
   In **Secret hash**, type any long password you make up (e.g. `blue-mango-42-rocket`). Save.
4. In `.env`:
   ```
   FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-..."
   FLUTTERWAVE_WEBHOOK_HASH="blue-mango-42-rocket"
   ```
   (The hash must be exactly the same in both places.)

### 10c. Korapay
1. Sign up at <https://merchant.korapay.com>.
2. **Settings → API Configuration**: copy the **Secret Key** (`sk_test_...`).
3. Set the **Webhook / Notification URL** to `https://YOUR-APP-URL/api/webhooks/korapay`
   (Leadabo also sends this address with every payment).
4. In `.env`: `KORAPAY_SECRET_KEY="sk_test_..."`.
5. Korapay is offered for Naira by default. If your account can take USD, add `KORAPAY_CURRENCIES="NGN,USD"`.

### 10d. Try it
1. Restart the app. **Settings → Integrations → Payments** should say "Live" and list your gateways.
2. Go to **Settings → Billing & Plans**, pick **₦ Naira**, choose a plan, pick Paystack → pay with
   the test card from the gateway's docs (Paystack: `4084 0840 8408 4081`, any future date, CVV `408`).
3. You land back on Billing with a green "Payment confirmed" box, and the plan shows as active.
   The **Payments** table lists the receipt.
4. When you're happy, swap each `sk_test_` key for the `sk_live_` one and set the **Live** webhook URLs.

> **No keys at all?** On your PC a "Test payment (no charge)" button appears so you can play.
> It is automatically hidden on your live website so nobody can get plans for free.

### Changing prices
Prices live in `src/config/plans.ts` (Naira in **kobo**, Dollars in **cents** — so ₦59,000 is
`5_900_000` and $79 is `7900`). Credit pack prices are in `src/lib/currency.ts`. After editing
plans run `npm run db:seed` to save them.

---

## Step 11 — Final check

1. Restart the app and the worker.
2. Open **Settings → Integrations** — everything you connected should be green.
3. Send yourself a test campaign from a connected inbox, reply to it, and within a few minutes
   the reply appears in **Inbox**.

## Getting new updates from GitHub (every time)

```
set DATABASE_URL=
copy "C:\path\to\old\folder\.env" .env      (only if this is a fresh download)
npm install
npx prisma migrate deploy
npm run db:seed          (only needed the first time, or when plan prices changed)
npm run dev
```

`db:seed` saves plans and courses and **rebuilds the demo workspace** (`demo@leadabo.com`) — don't
keep real work inside the demo account.

If anything goes red, copy the exact error message and send it — that's the fastest way to fix it.
