import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, paymentConfirmedEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paymongo-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event?.data?.attributes?.type;

  if (eventType !== "checkout_session.payment.paid") {
    // Acknowledge everything else so PayMongo doesn't keep retrying.
    return NextResponse.json({ received: true });
  }

  const session = event.data.attributes.data;
  const checkoutSessionId: string = session?.id;
  const referenceNumber: string | undefined = session?.attributes?.reference_number;

  if (!checkoutSessionId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, appointment_id")
    .eq("external_reference", checkoutSessionId)
    .maybeSingle();

  if (!payment) {
    console.warn("[paymongo:webhook] no matching payment for session", checkoutSessionId);
    return NextResponse.json({ received: true });
  }

  await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id);

  await supabase
    .from("appointments")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", payment.appointment_id);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("reference_number, customers(email)")
    .eq("id", payment.appointment_id)
    .maybeSingle();

  const customer = appointment?.customers as unknown as { email: string } | null;
  if (customer?.email) {
    await sendEmail({
      to: customer.email,
      subject: `Payment received — ${appointment?.reference_number ?? referenceNumber}`,
      html: paymentConfirmedEmail({
        referenceNumber: appointment?.reference_number ?? referenceNumber ?? "",
      }),
    });
  }

  return NextResponse.json({ received: true });
}
