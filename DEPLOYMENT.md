# Deployment guide: local → live

A linear runbook to take this project from the unzipped folder to a live
site. Follow it top to bottom the first time; skip around once it's live.

Time estimate: 45–90 minutes, mostly waiting on account sign-ups.

---

## 0. What you'll need

Accounts (all have free tiers, no cost to follow this guide):

- [Supabase](https://supabase.com) — database, auth, file storage
- [Vercel](https://vercel.com) — hosting (or Netlify/your own server, but
  this guide uses Vercel since it's a Next.js project)
- [Twilio](https://twilio.com) — SMS
- [PayMongo](https://paymongo.com) — payments
- [Resend](https://resend.com) — email
- A [GitHub](https://github.com) account (Vercel deploys from a git repo)

Local tools:

- Node.js 20 or later (`node -v` to check)
- Git
- The [Supabase CLI](https://supabase.com/docs/guides/cli) — only needed
  in step 8, for the reminders function

---

## 1. Get the code running locally

```bash
# unzip the project, then:
cd cindyrella
npm install
npm run dev
```

Open http://localhost:3000 — you should see the full site with the
bundled treatment/branch data. Nothing is wired to a real backend yet,
so bookings confirm locally without saving anywhere. That's expected —
you're just confirming the code runs before connecting anything.

---

## 2. Create the Supabase project

1. In the Supabase dashboard, click **New project**. Pick a name, a
   database password (save it somewhere), and a region close to your
   users (Singapore is closest to the Philippines).
2. Wait for it to finish provisioning (~2 minutes).
3. Go to the **SQL Editor**, and run each file in `supabase/migrations/`
   **in order**, pasting the contents and clicking Run for each:
   1. `0001_core_schema.sql`
   2. `0002_seed.sql`
   3. `0003_staff_admin_rls.sql`
   4. `0004_payment_external_ref.sql`
   5. `0005_booking_management_functions.sql`
4. Go to **Project Settings → API** and copy three values — you'll need
   them in the next step:
   - Project URL
   - `anon` `public` key
   - `service_role` key (keep this one secret)

---

## 3. Connect the app to Supabase locally

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=<project URL from step 2>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from step 2>
SUPABASE_SERVICE_ROLE_KEY=<service role key from step 2>
```

Restart `npm run dev`. Go to `/treatments` — pricing should now be
loading from the database instead of the bundled fallback (it'll look
identical since the seed data matches, but it's live now).

---

## 4. Create your first admin account

1. In Supabase, go to **Authentication → Users → Add user**. Set an
   email and password.
2. Copy that user's UUID (shown in the Users table).
3. Back in the **SQL Editor**, run:
   ```sql
   insert into staff (id, full_name, role)
   values ('<paste the UUID>', 'Your Name', 'admin');
   ```
4. Go to `/admin/login` locally and sign in. You should land on the
   overview dashboard.

---

## 5. Wire up Twilio, PayMongo, and Resend (test mode)

Each of these works independently — the site runs fine with none, some,
or all of them configured, so do them one at a time and verify as you go.
Full details for each are in `BACKEND_SETUP.md`; the short version:

**Twilio** — get a trial number, add to `.env.local`:
```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
```
Trial accounts can only text verified numbers — verify your own phone in
the Twilio console to test.

**PayMongo** — stay in **test mode** (toggle in the dashboard) for now:
```
PAYMONGO_SECRET_KEY=sk_test_...
```
Leave `PAYMONGO_WEBHOOK_SECRET` blank for now — you'll set it up in
step 9, once there's a live URL for PayMongo to call.

**Resend**:
```
RESEND_API_KEY=re_...
```
Leave `RESEND_FROM` unset for now — it'll send from `onboarding@resend.dev`,
which works fine for testing.

**WhatsApp & Facebook Messenger** (Phase 4):
Get these from your Meta Developer Account:
```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_ID=...
MESSENGER_PAGE_TOKEN=...
```

**Google Calendar Sync** (Phase 4):
Generate these from the Google Cloud Console:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

Restart the dev server after each addition and do a real test booking at
`/booking` to confirm each piece (text message arrives, PayMongo checkout
page appears for GCash/Card/Bank Transfer, email arrives).

---

## 6. Push the code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repository on GitHub, then:

```bash
git remote add origin <your repo URL>
git branch -M main
git push -u origin main
```

`.env.local` is already excluded via `.gitignore` (created by
`create-next-app`) — double check it's not in `git status` before
pushing. Never commit real secrets.

---

## 7. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub
   repo you just pushed. Vercel auto-detects Next.js — no config needed.
2. Before clicking Deploy, add environment variables (Settings →
   Environment Variables, or the form on the import screen) — copy every
   value from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
   - `PAYMONGO_SECRET_KEY`
   - `RESEND_API_KEY`, `RESEND_FROM` (if set)
   - `NEXT_PUBLIC_SITE_URL` — set this to your Vercel URL, e.g.
     `https://cindyrella.vercel.app` (or your custom domain if you're
     adding one now — see step 10)
3. Click **Deploy**. It takes 1–2 minutes.
4. Visit the live URL. Run through the same checks as step 5: home page
   loads, treatments load from Supabase, a test booking completes.

---

## 8. Point PayMongo's webhook at the live site

Local testing can't receive PayMongo's webhook (it can't reach
`localhost`), so this only works once deployed:

1. In the PayMongo dashboard, go to **Developers → Webhooks → Add**.
2. URL: `https://<your-domain>/api/webhooks/paymongo`
3. Event to subscribe to: `checkout_session.payment.paid`
4. Copy the **signing secret** it gives you.
5. Back in Vercel, add `PAYMONGO_WEBHOOK_SECRET` with that value, and
   redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new env var
   takes effect.
6. Test: make a real test-mode GCash/card payment through the live
   booking flow. Check **Developers → Webhooks → (your endpoint) →
   Logs** in PayMongo to confirm it received a `200` — if not, the
   signature check or the URL is off; the response body will tell you
   which.

---

## 9. Deploy the reminders function

```bash
supabase login
supabase link --project-ref <your-project-ref>   # found in Project Settings → General
supabase functions deploy send-reminders
supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...
```

Then schedule it — in the Supabase dashboard, **Database → Cron Jobs**,
add a daily job hitting your function URL (shown after deploying, looks
like `https://<project-ref>.functions.supabase.co/send-reminders`). Full
SQL alternative is in `BACKEND_SETUP.md` if you'd rather set it up that
way.

---

## 10. Custom domain (optional)

In Vercel: **Settings → Domains → Add**, follow the DNS instructions for
your registrar. Once it's verified:

- Update `NEXT_PUBLIC_SITE_URL` in Vercel's env vars to the new domain
  and redeploy.
- Update the PayMongo webhook URL (step 8) to the new domain.
- If you set `RESEND_FROM`, verify that domain in Resend (Domains → Add)
  so email doesn't land in spam — this needs a few DNS records too.

---

## 11. Go live with real payments

Everything above uses PayMongo's **test mode**, which is the right way
to build and rehearse. When you're ready to accept real money:

1. In PayMongo, complete their business verification (required before
   they release live keys).
2. Switch `PAYMONGO_SECRET_KEY` in Vercel to the `sk_live_...` key.
3. Repeat step 8 for the live webhook — test and live mode have
   separate webhook configurations in PayMongo, so you need a second
   one pointed at the same URL, subscribed to the same event, with its
   own signing secret in `PAYMONGO_WEBHOOK_SECRET`.
4. Do one real, small, real-money booking yourself end-to-end before
   telling anyone else the site is live.

---

## Post-launch checklist

- [ ] Book a session end-to-end as a customer (all four payment methods)
- [ ] Confirm SMS and email both arrive
- [ ] Confirm the PayMongo webhook marks the booking paid (check
      `/admin/appointments`)
- [ ] Reschedule and cancel a test booking via `/manage`
- [ ] Sign in to `/admin` and check the overview numbers reflect the
      test bookings
- [ ] Add a second staff account from `/admin/staff` and confirm they
      can sign in
- [ ] Trigger the reminders function manually once (call its URL
      directly) to confirm it's deployed correctly, before relying on
      the daily cron
