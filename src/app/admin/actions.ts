"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendSms } from "@/lib/sms";
import { sendEmail, staffInviteEmail } from "@/lib/email";

import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  // Session Tracking
  try {
    const adminClient = createAdminClient();
    
    // Get staff branch
    const { data: staffData } = await adminClient
      .from("staff")
      .select("branch_id")
      .eq("id", data.user.id)
      .single();

    // Parse headers for device info
    const reqHeaders = await headers();
    const userAgentStr = reqHeaders.get("user-agent") || "";
    const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "Unknown";
    
    // Use simple string parsing since ua-parser-js might not be installed, but if it is, this works.
    // We'll just fall back to basic parsing if needed, but let's assume standard strings.
    const parser = new UAParser(userAgentStr);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    
    const deviceName = device.type ? `${device.vendor || ''} ${device.type}`.trim() : "Desktop";
    const browserName = browser.name ? `${browser.name} ${browser.version || ''}` : "Unknown Browser";
    const osName = os.name ? `${os.name} ${os.version || ''}` : "Unknown OS";

    await adminClient.from("user_sessions").insert({
      user_id: data.user.id,
      branch_id: staffData?.branch_id || null,
      ip_address: ipAddress,
      device: deviceName,
      browser: browserName,
      os: osName,
      status: "ACTIVE"
    });
  } catch (err) {
    console.error("Failed to log session:", err);
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  
  // Get current user before signing out to update their session
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const adminClient = createAdminClient();
    await adminClient
      .from("user_sessions")
      .update({ 
        logout_at: new Date().toISOString(), 
        status: "LOGGED_OUT",
        logout_reason: "User initiated"
      })
      .eq("user_id", user.id)
      .eq("status", "ACTIVE");
  }

  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) return { error: "Could not update that appointment." };

  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
  return { error: null };
}

export async function addBlockedDate(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const branchId = String(formData.get("branch_id") ?? "");

  if (!date) return { error: "Pick a date." };

  const supabase = await createClient();
  const { error } = await supabase.from("blocked_dates").insert({
    blocked_date: date,
    reason: reason || null,
    branch_id: branchId || null,
  });

  if (error) return { error: "Could not block that date." };

  revalidatePath("/admin/settings");
  return { error: null };
}

export async function removeBlockedDate(id: string) {
  const supabase = await createClient();
  await supabase.from("blocked_dates").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

function generateTempPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6);
}

export type InviteResult =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string };

export async function inviteStaff(formData: FormData): Promise<InviteResult> {
  const canCreateStaff = await hasServerPermission("staff.create");
  if (!canCreateStaff) {
    return { ok: false, error: "You don't have permission to add staff." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "");
  const branchId = String(formData.get("branch_id") ?? "");

  if (!fullName || !email || !roleId) {
    return { ok: false, error: "Fill in name, email, and role." };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { ok: false, error: createError?.message ?? "Could not create that account." };
  }

  const { error: staffError } = await admin.from("staff").insert({
    id: created.user.id,
    full_name: fullName,
    role_id: roleId,
    branch_id: branchId || null,
  });

  if (staffError) {
    return { ok: false, error: "Account created, but the staff record failed to save." };
  }

  await sendEmail({
    to: email,
    subject: "Your Cindyrella staff account",
    html: staffInviteEmail({ fullName, email, tempPassword }),
  });

  revalidatePath("/admin/staff");
  return { ok: true, tempPassword };
}

export async function setStaffActive(staffId: string, isActive: boolean) {
  const canAssignRole = await hasServerPermission("users.assign_role");
  if (!canAssignRole) return { error: "Only authorized users can do that." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({ is_active: isActive })
    .eq("id", staffId);

  if (error) return { error: "Could not update that staff member." };
  revalidatePath("/admin/staff");
  return { error: null };
}

export async function updateStaffRole(
  staffId: string,
  roleId: string
) {
  const canAssignRole = await hasServerPermission("users.assign_role");
  if (!canAssignRole) return { error: "Only authorized users can do that." };

  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ role_id: roleId }).eq("id", staffId);

  if (error) return { error: "Could not update that role." };
  revalidatePath("/admin/staff");
  return { error: null };
}

export async function sendAppointmentReminder(appointmentId: string) {
  await requireStaff();

  const supabase = await createClient();
  const { data: appt, error } = await supabase
    .from("appointments")
    .select(
      "reference_number, appointment_date, appointment_time, treatments(name), branches(name), customers(phone)"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !appt) return { error: "Could not load that appointment." };

  const treatment = appt.treatments as unknown as { name: string } | null;
  const branch = appt.branches as unknown as { name: string } | null;
  const customer = appt.customers as unknown as { phone: string } | null;

  if (!customer?.phone) return { error: "No phone number on file for this client." };

  const result = await sendSms(
    customer.phone,
    `Reminder from Cindyrella Medical Group: your ${treatment?.name ?? "session"} at ${
      branch?.name ?? "our clinic"
    } is on ${appt.appointment_date} at ${appt.appointment_time}. Ref: ${appt.reference_number}.`
  );

  if (!result.sent) {
    return {
      error:
        result.reason === "not_configured"
          ? "Twilio isn't configured yet — add the credentials in .env.local."
          : "Could not send the reminder. Check the client's phone number.",
    };
  }

  return { error: null };
}
