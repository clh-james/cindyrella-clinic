// Deploy with: supabase functions deploy send-reminders
// Schedule it (see BACKEND_SETUP.md) to run once a day, e.g. at 9am.
//
// This runs in Deno, a separate runtime from the Next.js app, so the
// Twilio call and phone-number normalization are re-implemented here
// rather than imported from src/lib/sms.ts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function toE164PH(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+63") && digits.length === 13) return digits;
  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
  return null;
}

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) {
    console.log("[reminders] Twilio not configured, skipping", to);
    return;
  }

  const e164 = toE164PH(to);
  if (!e164) {
    console.warn("[reminders] unrecognized phone format", to);
    return;
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: e164, From: from, Body: body }),
  });

  if (!res.ok) {
    console.error("[reminders] send failed", await res.text());
  }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      "reference_number, appointment_time, treatments(name), branches(name), customers(phone)"
    )
    .eq("appointment_date", tomorrowIso)
    .neq("status", "cancelled");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const appt of appointments ?? []) {
    const treatment = appt.treatments as unknown as { name: string } | null;
    const branch = appt.branches as unknown as { name: string } | null;
    const customer = appt.customers as unknown as { phone: string } | null;
    if (!customer?.phone) continue;

    await sendSms(
      customer.phone,
      `Reminder from Cindyrella Medical Group: your ${treatment?.name ?? "session"} at ${
        branch?.name ?? "our clinic"
      } is tomorrow at ${appt.appointment_time}. Ref: ${appt.reference_number}.`
    );
    sent += 1;
  }

  return new Response(JSON.stringify({ date: tomorrowIso, reminders_sent: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
