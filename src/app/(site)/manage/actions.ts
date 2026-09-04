"use server";

import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

export type ManagedBooking = {
  appointmentId: string;
  referenceNumber: string;
  status: string;
  paymentStatus: string;
  date: string;
  time: string;
  treatmentName: string;
  treatmentPrice: number;
  branchId: string;
  branchName: string;
  customerFirstName: string;
  customerPhone: string;
};

export async function lookupBooking(
  referenceNumber: string,
  email: string
): Promise<ManagedBooking | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_booking_for_management", {
      p_reference: referenceNumber.trim(),
      p_email: email.trim(),
    })
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    appointment_id: string;
    reference_number: string;
    status: string;
    payment_status: string;
    appointment_date: string;
    appointment_time: string;
    treatment_name: string;
    treatment_price: number;
    branch_id: string;
    branch_name: string;
    customer_first_name: string;
    customer_phone: string;
  };

  return {
    appointmentId: row.appointment_id,
    referenceNumber: row.reference_number,
    status: row.status,
    paymentStatus: row.payment_status,
    date: row.appointment_date,
    time: row.appointment_time,
    treatmentName: row.treatment_name,
    treatmentPrice: row.treatment_price,
    branchId: row.branch_id,
    branchName: row.branch_name,
    customerFirstName: row.customer_first_name,
    customerPhone: row.customer_phone,
  };
}

export async function cancelBooking(
  referenceNumber: string,
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: ok, error } = await supabase.rpc("cancel_booking", {
    p_reference: referenceNumber.trim(),
    p_email: email.trim(),
  });

  if (error || !ok) {
    return { ok: false, error: "Could not find a matching booking to cancel." };
  }

  return { ok: true };
}

export async function rescheduleBooking(
  referenceNumber: string,
  email: string,
  newDate: string,
  newTime: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("reschedule_booking", {
    p_reference: referenceNumber.trim(),
    p_email: email.trim(),
    p_new_date: newDate,
    p_new_time: newTime,
  });

  if (error) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  if (result === "not_found") {
    return { ok: false, error: "Could not find a matching booking." };
  }
  if (result === "slot_unavailable") {
    return { ok: false, error: "That time slot isn't available — please choose another." };
  }

  // Best-effort notification of the new time.
  const booking = await lookupBooking(referenceNumber, email);
  if (booking) {
    const message = `Cindyrella Medical Group: Your booking ${referenceNumber} has been moved to ${newDate} at ${newTime}.`;
    await sendSms(booking.customerPhone, message).catch(() => null);
    await sendEmail({
      to: email,
      subject: `Your booking was rescheduled — ${referenceNumber}`,
      html: `<p>${message}</p>`,
    }).catch(() => null);
  }

  return { ok: true };
}
