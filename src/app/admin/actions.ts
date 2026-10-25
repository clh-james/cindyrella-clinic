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
    try {
      const adminClient = createAdminClient();
      const reqHeaders = await headers();
      const userAgentStr = reqHeaders.get("user-agent") || "";
      let ipAddressStr = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip");
      if (ipAddressStr && ipAddressStr.includes(",")) ipAddressStr = ipAddressStr.split(",")[0].trim();
      if (!ipAddressStr || ipAddressStr === "Unknown" || ipAddressStr === "::1") ipAddressStr = "127.0.0.1";

      const parser = new UAParser(userAgentStr);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();

      await adminClient.from("auth_events").insert({
        event_type: "LOGIN_FAILED",
        outcome: "FAILURE",
        reason_code: "INVALID_CREDENTIALS",
        description: `Failed login attempt for email: ${email}`,
        ip_address: ipAddressStr,
        user_agent: userAgentStr,
        device_type: device.type || "Desktop",
        browser: browser.name ? `${browser.name} ${browser.version || ""}` : "Unknown",
        operating_system: os.name ? `${os.name} ${os.version || ""}` : "Unknown",
        metadata: { attempted_email: email },
      });
    } catch (logErr) {
      console.error("Failed to log failed auth event:", logErr);
    }

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
    // Note: for INET in postgres, 'Unknown' will fail. We should leave it null if unknown, or try to get a valid IP.
    let ipAddressStr = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip");
    // Ensure it's a valid IP or null
    if (ipAddressStr && ipAddressStr.includes(",")) ipAddressStr = ipAddressStr.split(",")[0].trim();
    if (!ipAddressStr || ipAddressStr === "Unknown" || ipAddressStr === "::1") ipAddressStr = "127.0.0.1";
    
    const parser = new UAParser(userAgentStr);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    
    const deviceName = device.model || "Unknown";
    const deviceType = device.type || "Desktop";
    const browserName = browser.name ? `${browser.name} ${browser.version || ''}` : "Unknown";
    const osName = os.name ? `${os.name} ${os.version || ''}` : "Unknown";

    // Invalidate existing sessions for this user to avoid multi-login
    await adminClient
      .from("user_sessions")
      .update({
        status: "FORCE_LOGGED_OUT",
        logout_at: new Date().toISOString(),
        logout_reason: "MULTI_LOGIN",
      })
      .eq("user_id", data.user.id)
      .eq("status", "ACTIVE");

    const now = new Date().toISOString();
    
    // Insert user session
    const { data: sessionData, error: sessionError } = await adminClient.from("user_sessions").insert({
      user_id: data.user.id,
      branch_id: staffData?.branch_id || null,
      ip_address: ipAddressStr,
      user_agent: userAgentStr,
      device_type: deviceType,
      device_name: deviceName,
      browser: browserName,
      operating_system: osName,
      status: "ACTIVE",
      last_activity_at: now
    }).select("id").single();

    if (sessionError) {
      console.error("Failed to create user_session:", sessionError);
    }

    // Insert auth event
    if (sessionData) {
      await adminClient.from("auth_events").insert({
        user_id: data.user.id,
        branch_id: staffData?.branch_id || null,
        session_id: sessionData.id,
        event_type: "LOGIN_SUCCESS",
        outcome: "SUCCESS",
        ip_address: ipAddressStr,
        user_agent: userAgentStr,
        device_type: deviceType,
        browser: browserName,
        operating_system: osName,
        metadata: { login_method: "password" }
      });
    }

  } catch (err) {
    console.error("Failed to log session:", err);
  }

  redirect("/admin");
}

export async function pingActivity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const adminClient = createAdminClient();
    const { data: activeSession } = await adminClient
      .from("user_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .order("login_at", { ascending: false })
      .limit(1)
      .single();

    if (activeSession) {
      await adminClient
        .from("user_sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", activeSession.id);
    }
  }
}

export async function signOut(reasonOrFormData?: string | FormData) {
  const reason = typeof reasonOrFormData === 'string' ? reasonOrFormData : "USER_LOGOUT";
  const supabase = await createClient();
  
  // Get current user before signing out to update their session
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const adminClient = createAdminClient();
    
    // Find active session to calculate duration
    const { data: activeSession } = await adminClient
      .from("user_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .order("login_at", { ascending: false })
      .limit(1)
      .single();

    if (activeSession) {
      const logoutAt = new Date();
      const loginAt = new Date(activeSession.login_at);
      const durationSeconds = Math.floor((logoutAt.getTime() - loginAt.getTime()) / 1000);

      await adminClient
        .from("user_sessions")
        .update({ 
          logout_at: logoutAt.toISOString(), 
          status: "LOGGED_OUT",
          logout_reason: reason,
          duration_seconds: durationSeconds
        })
        .eq("id", activeSession.id);

      // Log auth event
      await adminClient.from("auth_events").insert({
        user_id: user.id,
        branch_id: activeSession.branch_id,
        session_id: activeSession.id,
        event_type: "LOGOUT",
        outcome: "SUCCESS",
        ip_address: activeSession.ip_address,
        user_agent: activeSession.user_agent,
        device_type: activeSession.device_type,
        browser: activeSession.browser,
        operating_system: activeSession.operating_system,
        metadata: { duration_seconds: durationSeconds }
      });
    }
  }

  await supabase.auth.signOut();
  redirect("/admin/login");
}

import { 
  deductAppointmentInventory, 
  reverseAppointmentInventory,
  recordDirectUsedItems 
} from "@/lib/inventory/deduction";

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
) {
  const supabase = await createClient();

  // 1. Fetch current appointment status before updating
  const { data: currentAppt } = await supabase
    .from("appointments")
    .select("id, status, reference_number, treatment_id, branch_id")
    .eq("id", appointmentId)
    .single();

  const prevStatus = currentAppt?.status;

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) return { error: "Could not update that appointment." };

  // 2. Automated Inventory Deduction and Commission Auto-Credit when appointment is marked completed
  if (status === "completed" && prevStatus !== "completed") {
    try {
      const user = await supabase.auth.getUser();
      await deductAppointmentInventory(appointmentId, user.data.user?.id);
    } catch (deductErr) {
      console.error("Auto inventory deduction failed on appointment completion:", deductErr);
    }

    try {
      await autoCreditAppointmentCommission(appointmentId);
    } catch (commErr) {
      console.error("Auto commission crediting failed on appointment completion:", commErr);
    }
  } else if (prevStatus === "completed" && (status === "cancelled" || status === "no_show")) {
    try {
      const user = await supabase.auth.getUser();
      await reverseAppointmentInventory(appointmentId, user.data.user?.id, `Appointment marked as ${status}`);
    } catch (revErr) {
      console.error("Inventory reversal failed:", revErr);
    }

    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("commission_records")
        .update({ status: "rejected", notes: `Revoked: Appointment marked as ${status}` })
        .eq("source_id", appointmentId)
        .eq("source_type", "appointment");
    } catch (revCommErr) {
      console.error("Commission revocation failed:", revCommErr);
    }
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/payroll");
  revalidatePath("/admin");
  return { error: null };
}

export async function autoCreditAppointmentCommission(appointmentId: string) {
  const adminClient = createAdminClient();

  const { data: appt } = await adminClient
    .from("appointments")
    .select("id, reference_number, branch_id, treatment_id, amount_due, appointment_date, notes, treatments(name, session_price)")
    .eq("id", appointmentId)
    .single();

  if (!appt) return;

  // 1. Fetch handler
  let handlerId: string | null = (appt as unknown as { handled_by?: string }).handled_by || null;
  if (!handlerId && appt.notes) {
    const match = appt.notes.match(/\[HandledBy:([a-f0-9-]+)\]/i);
    if (match) handlerId = match[1];
  }

  // 2. Fetch service quotas config from payroll_settings
  const { data: quotasRow } = await adminClient
    .from("payroll_settings")
    .select("value")
    .eq("key", "service_quotas")
    .maybeSingle();

  const quotasMap = (quotasRow?.value || {}) as Record<string, {
    handled_by?: string | null;
    commission_rate?: number;
    commission_type?: "percentage" | "fixed";
  }>;

  const treatmentConfig = quotasMap[appt.treatment_id] || {};
  if (!handlerId) {
    handlerId = treatmentConfig.handled_by || null;
  }

  if (!handlerId) return; // No handler assigned yet

  // 3. Compute commission
  const treatment = appt.treatments as unknown as { name: string; session_price: number } | null;
  const itemName = treatment?.name || "Clinic Service";
  const baseAmount = Number(appt.amount_due || treatment?.session_price || 0);

  const commRate = Number(treatmentConfig.commission_rate ?? 10);
  const isPercentage = (treatmentConfig.commission_type || "percentage") === "percentage";

  const commAmount = isPercentage
    ? Math.round(baseAmount * (commRate / 100) * 100) / 100
    : Math.round(commRate * 100) / 100;

  if (commAmount <= 0) return;

  const { data: staffData } = await adminClient
    .from("staff")
    .select("full_name")
    .eq("id", handlerId)
    .single();

  const staffName = staffData?.full_name || "Therapist";

  // Check existing commission
  const { data: existingComm } = await adminClient
    .from("commission_records")
    .select("id")
    .eq("source_id", appt.id)
    .eq("source_type", "appointment")
    .maybeSingle();

  const commPayload = {
    employee_id: handlerId,
    branch_id: appt.branch_id || null,
    source_type: "appointment",
    source_id: appt.id,
    reference_number: appt.reference_number,
    item_name: itemName,
    base_amount: baseAmount,
    commission_rate: commRate,
    is_percentage: isPercentage,
    commission_amount: commAmount,
    split_ratio: 1.0,
    date_earned: appt.appointment_date || new Date().toISOString().slice(0, 10),
    status: "approved",
    notes: `Auto-computed for ${staffName} (Completed service: ${itemName})`,
  };

  if (existingComm) {
    await adminClient
      .from("commission_records")
      .update(commPayload)
      .eq("id", existingComm.id);
  } else {
    await adminClient
      .from("commission_records")
      .insert(commPayload);
  }

  revalidatePath("/admin/payroll");
}

export async function setAppointmentHandler(appointmentId: string, staffId: string) {
  await requireStaff();
  const adminClient = createAdminClient();

  const { data: appt } = await adminClient
    .from("appointments")
    .select("id, status, notes")
    .eq("id", appointmentId)
    .single();

  if (!appt) return { error: "Appointment not found." };

  const existingNotes = appt.notes || "";
  let updatedNotes = existingNotes;
  if (/\[HandledBy:[^\]]+\]/i.test(existingNotes)) {
    updatedNotes = existingNotes.replace(/\[HandledBy:[^\]]+\]/i, staffId ? `[HandledBy:${staffId}]` : "");
  } else if (staffId) {
    updatedNotes = existingNotes ? `${existingNotes} [HandledBy:${staffId}]` : `[HandledBy:${staffId}]`;
  }

  // Attempt column update with fallback to notes
  const { error: colErr } = await adminClient
    .from("appointments")
    .update({ handled_by: staffId || null, notes: updatedNotes })
    .eq("id", appointmentId);

  if (colErr) {
    await adminClient
      .from("appointments")
      .update({ notes: updatedNotes })
      .eq("id", appointmentId);
  }

  // If appointment is already completed, auto-compute commission right now
  if (appt.status === "completed" && staffId) {
    try {
      await autoCreditAppointmentCommission(appointmentId);
    } catch (e) {
      console.error("Failed to auto-credit commission on handler assign:", e);
    }
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/payroll");
  return { success: true };
}

export async function getAppointmentUsedMaterials(appointmentId: string) {
  const adminClient = createAdminClient();

  const { data: appointment } = await adminClient
    .from("appointments")
    .select("id, reference_number, status, branch_id, treatment_id, treatments(id, name), branches(name)")
    .eq("id", appointmentId)
    .single();

  if (!appointment) return { error: "Appointment not found." };

  const treatment = appointment.treatments as unknown as { id: string; name: string } | null;

  // Recipe materials
  const { data: recipe } = await adminClient
    .from("treatment_materials")
    .select("item_id, quantity_required, inventory_items(id, name, unit, current_stock, category)")
    .eq("treatment_id", appointment.treatment_id);

  // Actual movements already logged for this appointment
  const { data: actualMovements } = await adminClient
    .from("inventory_movements")
    .select("id, reference_number, item_id, quantity, unit, previous_quantity, new_quantity, reason, created_at, inventory_items(name)")
    .eq("reference_id", appointment.reference_number)
    .eq("movement_type", "stock_out");

  return {
    appointment,
    treatmentName: treatment?.name || "Treatment",
    recipe: recipe || [],
    actualMovements: actualMovements || [],
    isDeducted: (actualMovements || []).length > 0,
  };
}

export async function recordAdditionalUsedItems(
  appointmentId: string,
  items: { itemId: string; quantity: number }[],
  notes?: string
) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, reference_number, branch_id, treatments(name)")
    .eq("id", appointmentId)
    .single();

  if (!appt) return { error: "Appointment not found." };

  const treatment = appt.treatments as unknown as { name: string } | null;

  const result = await recordDirectUsedItems({
    appointmentId: appt.id,
    referenceNumber: appt.reference_number,
    branchId: appt.branch_id,
    treatmentName: treatment?.name,
    items,
    performedByUserId: user.data.user?.id,
    notes: notes || `Additional consumables used for ${appt.reference_number}`,
  });

  if (!result.success) return { error: result.error || "Failed to record used items" };

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/inventory");
  return { success: true, count: result.count, deductedItems: result.deductedItems };
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

export async function changeStaffPasswordAction(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const user = await requireStaff();
    const supabase = await createClient();

    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword) {
      return { ok: false, error: "Please enter your current password." };
    }
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: "New password must be at least 8 characters long." };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: "New password and confirm password do not match." };
    }
    if (currentPassword === newPassword) {
      return { ok: false, error: "New password must be different from your current password." };
    }

    const userEmail = user.email || (await supabase.auth.getUser()).data.user?.email;
    if (!userEmail) {
      return { ok: false, error: "Unable to determine your account email." };
    }

    // Verify current password by attempting re-authentication
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (verifyError) {
      return { ok: false, error: "Incorrect current password. Please check and try again." };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { ok: false, error: updateError.message || "Failed to update password." };
    }

    // Log security audit event
    try {
      const adminClient = createAdminClient();
      await adminClient.from("audit_logs").insert({
        user_id: user.id,
        action: "auth.password_changed",
        resource_type: "auth.users",
        resource_id: user.id,
        metadata: {
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      });

      await adminClient.from("auth_events").insert({
        user_id: user.id,
        event_type: "PASSWORD_CHANGED",
        outcome: "SUCCESS",
        description: `Staff user ${user.email} changed their password successfully`,
      });
    } catch (auditErr) {
      console.error("Non-fatal audit logging error:", auditErr);
    }

    return { ok: true, message: "Your password has been changed successfully!" };
  } catch (err: unknown) {
    console.error("changeStaffPasswordAction error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "An unexpected error occurred." };
  }
}

