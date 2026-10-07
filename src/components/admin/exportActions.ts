/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export async function fetchAppointmentsForExport() {
  const supabase = await createClient();
  const user = await requireStaff();

  // Get user role and branch
  const { data: staffData } = await supabase.from("staff").select("role, branch_id").eq("id", user.id).single();
  const role = staffData?.role || "STAFF";
  const branchId = staffData?.branch_id;

  let query = supabase.from("appointments").select(`
    id, reference_number, appointment_date, appointment_time, status, amount_due, payment_method, notes, created_at,
    treatments ( name ),
    branches ( name ),
    customers ( first_name, last_name, phone )
  `).order("appointment_date", { ascending: false });

  // Apply RBAC filtering
  if (role === "CASHIER" || role === "MANAGER" || role === "BRANCH HEAD") {
    if (branchId) {
      query = query.eq("branch_id", branchId);
    } else {
      // Safety catch: if somehow a branch role has no branch, return empty
      query = query.eq("branch_id", "00000000-0000-0000-0000-000000000000"); 
    }
  }
  // OWNER, SUPER ADMIN see all

  const { data: appointments, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  // Format data for export
  const formattedData = (appointments || []).map(a => {
    const customer = a.customers as any;
    const customerName = customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Unknown" : "Unknown";
    
    // Determine payment status based on amount_due and payment_method, or just status logic
    let paymentStatus = "Unpaid";
    if (a.payment_method && a.payment_method !== "unpaid" && a.amount_due > 0) {
      paymentStatus = "Paid";
    }

    let cleanNotes = a.notes || "blank";
    if (typeof cleanNotes === "string" && cleanNotes.trim().startsWith("[{")) {
      try {
        const parsed = JSON.parse(cleanNotes);
        cleanNotes = parsed.map((item: any) => item.name || item.id).join(", ");
      } catch(e) {}
    }

    return {
      "Appointment ID": a.reference_number || a.id,
      "Customer Name": customerName,
      "Contact Number": customer?.phone || "N/A",
      "Service / Treatment": (a.treatments as any)?.name || "N/A",
      "Branch": (a.branches as any)?.name || "N/A",
      "Appointment Date": a.appointment_date || "N/A",
      "Appointment Time": a.appointment_time || "N/A",
      "Amount Due": a.amount_due || 0,
      "Appointment Status": a.status || "Unknown",
      "Payment Status": paymentStatus,
      "Payment Method": a.payment_method || "Unpaid",
      "Assigned Staff": (a.staff as any)?.full_name || "Unassigned",
      "Created At": a.created_at ? new Date(a.created_at).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A",
      "Notes": cleanNotes
    };
  });

  return formattedData;
}
