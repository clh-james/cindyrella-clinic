# Backend setup (Supabase)

The site runs with no backend out of the box — the booking wizard uses the
bundled treatment/branch list and confirms locally. To make bookings real:

1. Create a project at https://supabase.com.
2. In the SQL editor, run the files in `supabase/migrations/` in order:
   - `0001_core_schema.sql` — tables, enums, and row-level security policies
   - `0002_seed.sql` — the four branches and seven treatments from the brochure
   - `0003_staff_admin_rls.sql` — lets admins manage the staff list from the dashboard
   - `0004_payment_external_ref.sql` — links a payment to its PayMongo checkout session
   - `0005_booking_management_functions.sql` — powers slot-availability checks and the customer self-service manage-booking page
   - `0006_customer_loyalty.sql` — customer loyalty points system
   - `0007_promo_codes.sql` — dynamic discount and promo code rules
   - `0008_inventory.sql` — inventory master list and automated stock deduction
   - `0009_pos_sales.sql` — Point of Sale (POS) retail tracking
3. Copy `.env.example` to `.env.local` and fill in your project's URL, anon
   key, and **service role key** (all three under Project Settings → API —
   the service role key is required for the "add staff" feature below and
   must stay server-side; it's already excluded from `NEXT_PUBLIC_*`).
4. Restart the dev server. The booking page now reads treatments/branches
   from Supabase, and confirming a booking writes real `customers` and
   `appointments` rows and returns a reference number like `CMG-202600001`.

## What's enforced today

- **Guest booking**: anyone can create a customer + appointment (needed for
  the public booking flow); nobody can read other people's records without
  a `staff` row.
- **Slot capacity**: each branch defaults to 3 bookings per time slot
  (`branch_settings.max_bookings_per_slot`) — the server action rejects a
  booking once a slot is full, so double-booking isn't possible at the
  database level.
- **Staff access**: an `is_staff()` check gates full read/write access for
  anyone in the `staff` table (admin, receptionist, nurse, doctor roles).
  There's no staff sign-up UI yet — that, along with the admin dashboard
  that will use this same access, is the next phase.

## Admin dashboard

The dashboard lives at `/admin` and needs both a Supabase auth user and a
matching row in `staff`. There's no self-serve sign-up (staff accounts are
created by whoever runs the clinic, not the public), so to create your first
admin:

1. In the Supabase dashboard, go to **Authentication → Users → Add user**
   and create an account with an email and password.
2. In the SQL editor, add that user to the `staff` table:

   ```sql
   insert into staff (id, full_name, role)
   values ('<the user''s UUID from the Users tab>', 'Your Name', 'admin');
   ```

3. Sign in at `/admin/login` with that email and password.

From there you can see today's bookings and revenue, a 7-day revenue chart,
the most-booked treatment this month, manage every appointment's status
(pending → confirmed → completed/cancelled/no-show), block dates or review
per-branch slot capacity under Schedule settings, and — for admins — add
more staff under the Staff tab (it creates their login, emails them their
temporary password, and also shows it once in the UI as a backup).

Visiting `/admin` without Supabase configured, or without being signed in,
redirects to a setup notice or the login page rather than erroring.

## SMS (Twilio)

1. Create a Twilio account at https://twilio.com and get a phone number
   able to send SMS (trial accounts can text verified numbers only).
2. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`
   to `.env.local` (all from the Twilio console).
3. That's it — two things now text automatically:
   - **Booking confirmation**: sent the moment a customer completes the
     booking wizard, with the treatment, branch, date/time, and reference
     number.
   - **Manual reminders**: on the Appointments page, staff can click
     "Remind" next to any booking to text that client on demand.

Phone numbers are normalized from local Philippine format (`09XXXXXXXXX`)
to the `+63XXXXXXXXXX` format Twilio requires. Without Twilio configured,
sending is skipped silently (logged to the server console) rather than
failing the booking — so the site still works fully without it.

There's no automatic day-before reminder yet — that needs a scheduled job
(e.g. a Supabase Edge Function on a cron trigger) calling the reminder
logic for the next day's appointments, which is a good next step once
you're ready.

## Payments (PayMongo)

1. Create an account at https://dashboard.paymongo.com and switch it to
   test mode while you build.
2. Add `PAYMONGO_SECRET_KEY` (Developers → API keys) to `.env.local`.
3. Choosing GCash, Credit Card, or Bank Transfer at the last step of
   booking now creates a PayMongo checkout session and redirects the
   customer there instead of confirming immediately. Choosing **Cash**
   still confirms right away with no online charge — the balance is
   settled at the clinic, as in the original flow.
4. To have payments actually mark a booking as paid, register a webhook:
   in the PayMongo dashboard, go to Developers → Webhooks → Add endpoint,
   point it at `https://your-domain.com/api/webhooks/paymongo`, and
   subscribe to the `checkout_session.payment.paid` event. Copy the
   signing secret it gives you into `PAYMONGO_WEBHOOK_SECRET`.
5. Set `NEXT_PUBLIC_SITE_URL` to your real deployed URL so PayMongo can
   redirect customers back to `/booking/confirmed` correctly (it defaults
   to `http://localhost:3000` for local testing).

Without `PAYMONGO_SECRET_KEY` set, online payment methods silently skip
the checkout redirect and confirm the same way cash does — so the booking
flow still works end-to-end without PayMongo configured.

"Bank Transfer" maps to PayMongo's online-banking product (their closest
equivalent to a direct bank transfer); GCash and Credit Card map directly.

## Email (Resend)

1. Create an account at https://resend.com and grab an API key.
2. Add `RESEND_API_KEY` to `.env.local`. Leaving `RESEND_FROM` unset sends
   from `onboarding@resend.dev`, which works for testing without a
   verified domain — for production, verify your own domain in Resend and
   set `RESEND_FROM` to an address on it.
3. Three emails now go out automatically: a booking confirmation (with a
   "Complete payment" button when payment is still pending), a payment-
   received notice once the PayMongo webhook confirms it, and a staff
   welcome email with their temporary password when an admin adds them.

Without `RESEND_API_KEY` set, sends are skipped silently (logged to the
server console), same as the Twilio and PayMongo fallbacks.

## Manage my booking

`/manage` lets a customer look up their own booking with just their
reference number and the email they booked with — no login needed. From
there they can reschedule (same date/time picker as booking, same
capacity + blocked-date check) or cancel outright.

This is backed by four Postgres functions in `0005_booking_management_functions.sql`
that run with elevated privilege but enforce their own narrow rule
internally (the email must match), rather than opening a broad `SELECT`
or `UPDATE` policy on `appointments` to the public. The original booking
flow's slot-capacity check was actually broken before this migration —
the anon key had no `SELECT` policy on `appointments` at all, so the
capacity check silently used built-in defaults. It now goes through the
same `is_slot_available()` function these use, which also picks up
blocked-date checking that the original flow never had.

## Automatic day-before reminders

`supabase/functions/send-reminders` is an Edge Function that texts
everyone booked for the next day. To turn it on:

1. Install the Supabase CLI, then from the project root:
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy send-reminders
   supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...
   ```
2. Schedule it to run daily. In the Supabase dashboard, go to
   **Database → Cron Jobs** and add a job that calls the function's URL
   once a day (e.g. 9am), or run this SQL (requires the `pg_cron` and
   `pg_net` extensions, enabled from Database → Extensions):
   ```sql
   select cron.schedule(
     'send-reminders-daily',
     '0 9 * * *',
     $$
     select net.http_post(
       url := 'https://<your-project-ref>.functions.supabase.co/send-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer <your-anon-key>')
     );
     $$
   );
   ```

This is separate from the manual "Remind" button on the Appointments
page — that one's for a one-off nudge; this is the automatic version.

## Not yet built

There isn't one right now — every item from the original brief has a
working implementation or a documented path to turn it on.
