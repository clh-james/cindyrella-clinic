import "server-only";
import crypto from "crypto";
import type { PaymentMethod } from "@/lib/supabase/types";

function isConfigured() {
  return !!process.env.PAYMONGO_SECRET_KEY;
}

function authHeader() {
  return `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`;
}

// PayMongo's checkout method codes for the payment methods we expose.
// "bank_transfer" maps to their online-banking product (Direct Online
// Banking); there's no generic instant bank-transfer method on PayMongo
// today, so this is the closest equivalent.
const methodMap: Record<Exclude<PaymentMethod, "cash">, string[]> = {
  gcash: ["gcash"],
  maya: ["paymaya"],
  credit_card: ["card"],
  bank_transfer: ["dob"],
};

export type CheckoutSession = {
  id: string;
  checkoutUrl: string;
};

export async function createCheckoutSession(params: {
  amount: number; // whole pesos
  description: string;
  referenceNumber: string;
  method: Exclude<PaymentMethod, "cash">;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession | null> {
  if (!isConfigured()) {
    console.log("[paymongo:skipped — not configured]", params.referenceNumber);
    return null;
  }

  const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: params.description,
          reference_number: params.referenceNumber,
          line_items: [
            {
              amount: Math.round(params.amount * 100),
              currency: "PHP",
              name: params.description,
              quantity: 1,
            },
          ],
          payment_method_types: methodMap[params.method],
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        },
      },
    }),
  });

  if (!res.ok) {
    console.error("[paymongo:create_failed]", await res.text());
    return null;
  }

  const json = await res.json();
  return {
    id: json.data.id,
    checkoutUrl: json.data.attributes.checkout_url,
  };
}

// PayMongo signs webhooks as: "t=<timestamp>,te=<test_sig>,li=<live_sig>"
// where the signed payload is `${t}.${rawBody}`, HMAC-SHA256 with the
// webhook's signing secret.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts.t;
  const candidate = parts.li ?? parts.te;
  if (!timestamp || !candidate) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
  } catch {
    return false;
  }
}
