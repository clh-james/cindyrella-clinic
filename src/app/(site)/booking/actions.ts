"use server";

import { createClient } from "@/lib/supabase/server";
import type { NewCustomer, PaymentMethod } from "@/lib/supabase/types";
import { sendSms } from "@/lib/sms";
import { sendEmail, bookingConfirmationEmail } from "@/lib/email";
import { createCheckoutSession } from "@/lib/paymongo";
import { insertCalendarEvent } from "@/lib/googleCalendar";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendMessengerMessage } from "@/lib/messenger";

export type BookingInput = {
  treatmentId: string;
  branchId: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // e.g. "10AM"
  paymentMethod: PaymentMethod;
  amountDue: number;
  customer: NewCustomer;
  applied_promo_code?: string;
};

export type BookingResult =
  | { ok: true; referenceNumber: string; checkoutUrl?: string }
  | { ok: false; error: string };

function generateReference() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `CMG-${year}${rand}`;
}

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const supabase = await createClient();

  // 1. Availability check — capacity and blocked dates, via a security-
  // definer function (the public key has no SELECT on `appointments`).
  const { data: available, error: availabilityError } = await supabase.rpc(
    "is_slot_available",
    { p_branch_id: input.branchId, p_date: input.date, p_time: input.time }
  );

  if (availabilityError) {
    return { ok: false, error: "Could not check slot availability. Please try again." };
  }
  if (!available) {
    return { ok: false, error: "That time slot isn't available — please choose another." };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert({ ...input.customer, auth_id: input.customer.auth_id || undefined }, { onConflict: "email" })
    .select("id, loyalty_points")
    .single();

  if (customerError || !customer) {
    return { ok: false, error: "Could not save your details. Please check the form and try again." };
  }

  // Calculate new points (1 point per ₱100)
  const earnedPoints = Math.floor(input.amountDue / 100);
  
  if (customer.id && earnedPoints > 0) {
    await supabase.rpc('increment_loyalty_points', { 
      customer_id_param: customer.id, 
      points_param: earnedPoints 
    });
    // In absence of RPC, we can just do a direct update:
    await supabase.from("customers").update({
      loyalty_points: (customer.loyalty_points || 0) + earnedPoints
    }).eq("id", customer.id);
  }

  // 3. Create the appointment.
  const referenceNumber = generateReference();
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      reference_number: referenceNumber,
      customer_id: customer.id,
      treatment_id: input.treatmentId,
      branch_id: input.branchId,
      appointment_date: input.date,
      appointment_time: input.time,
      payment_method: input.paymentMethod,
      amount_due: input.amountDue,
      applied_promo_code: input.applied_promo_code || null,
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return { ok: false, error: "Could not confirm your booking. Please try again." };
  }
  
  if (input.applied_promo_code) {
    await supabase.rpc('increment_promo_usage', { promo_id: input.applied_promo_code });
    // In absence of RPC, we can just do a direct update if we first read the current count, but for safety in production you'd use RPC.
  }

  const [{ data: treatment }, { data: branch }] = await Promise.all([
    supabase.from("treatments").select("name, duration_minutes").eq("id", input.treatmentId).maybeSingle(),
    supabase.from("branches").select("name").eq("id", input.branchId).maybeSingle(),
  ]);

  // 4. Online payment methods get a PayMongo checkout session; cash doesn't.
  let checkoutUrl: string | undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (input.paymentMethod !== "cash") {
    const session = await createCheckoutSession({
      amount: input.amountDue,
      description: treatment?.name ?? "IV Drip Therapy",
      referenceNumber,
      method: input.paymentMethod,
      successUrl: `${siteUrl}/booking/confirmed?ref=${referenceNumber}`,
      cancelUrl: `${siteUrl}/booking?cancelled=1`,
    });

    await supabase.from("payments").insert({
      appointment_id: appointment.id,
      amount: input.amountDue,
      method: input.paymentMethod,
      status: "pending",
      external_reference: session?.id ?? null,
    });

    checkoutUrl = session?.checkoutUrl;
  } else {
    await supabase.from("payments").insert({
      appointment_id: appointment.id,
      amount: input.amountDue,
      method: input.paymentMethod,
      status: "pending",
    });
  }

  // 5. Confirmation SMS + email — best-effort; a failed send never fails the booking.
  const messageBody = `Cindyrella Medical Group: Your ${treatment?.name ?? "session"} is booked at ${
      branch?.name ?? "our clinic"
    } on ${input.date} at ${input.time}. Ref: ${referenceNumber}. See you soon!`;

  await sendSms(input.customer.phone, messageBody);
  await sendWhatsAppMessage(input.customer.phone, messageBody);

  await sendEmail({
    to: input.customer.email,
    subject: `Your Cindyrella booking — ${referenceNumber}`,
    html: bookingConfirmationEmail({
      treatmentName: treatment?.name ?? "IV Drip Therapy",
      branchName: branch?.name ?? "our clinic",
      date: input.date,
      time: input.time,
      referenceNumber,
      paymentUrl: checkoutUrl,
    }),
  });
  
  // 6. Sync to Google Calendar
  // Parse time (e.g. "10AM") into ISO string
  try {
    const isPM = input.time.includes("PM") && !input.time.includes("12PM");
    const is12AM = input.time.includes("12AM");
    const hour = parseInt(input.time.replace(/AM|PM/, "")) + (isPM ? 12 : (is12AM ? -12 : 0));
    
    const startTime = new Date(`${input.date}T${hour.toString().padStart(2, '0')}:00:00+08:00`);
    const endTime = new Date(startTime.getTime() + (treatment?.duration_minutes ?? 30) * 60000);
    
    await insertCalendarEvent({
      summary: `Booking: ${input.customer.first_name} ${input.customer.last_name} - ${treatment?.name}`,
      description: `Reference: ${referenceNumber}\nPhone: ${input.customer.phone}\nBranch: ${branch?.name}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });
  } catch (err) {
    console.error("Failed to parse date for Google Calendar:", err);
  }

  return { ok: true, referenceNumber, checkoutUrl };
}
