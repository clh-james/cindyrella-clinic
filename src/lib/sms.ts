import "server-only";
import twilio from "twilio";

function isConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

// Accepts PH-style local numbers (09XXXXXXXXX) or already-E.164 (+63...)
// and normalizes to E.164, which Twilio requires.
export function toE164PH(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+63") && digits.length === 13) return digits;
  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
  return null;
}

export type SmsResult = { sent: boolean; reason?: string };

export async function sendSms(toRaw: string, body: string): Promise<SmsResult> {
  if (!isConfigured()) {
    console.log("[sms:skipped — Twilio not configured]", toRaw, body);
    return { sent: false, reason: "not_configured" };
  }

  const to = toE164PH(toRaw);
  if (!to) {
    console.warn("[sms:skipped — unrecognized phone format]", toRaw);
    return { sent: false, reason: "invalid_number" };
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    await client.messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER!,
      body,
    });
    return { sent: true };
  } catch (err) {
    console.error("[sms:failed]", err);
    return { sent: false, reason: "send_failed" };
  }
}
