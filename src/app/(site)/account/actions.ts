// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Customer Portal Server Actions (Password Change & Account Management)
// ==============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function changeCustomerPasswordAction(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Please log in to change your password." };
    }

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

    // Verify current password by attempting re-authentication
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
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
      await adminClient.from("auth_events").insert({
        user_id: user.id,
        event_type: "PASSWORD_CHANGED",
        outcome: "SUCCESS",
        description: `Customer ${user.email} changed their account password`,
        metadata: { user_type: "customer" },
      });
    } catch (auditErr) {
      console.error("Non-fatal customer audit log error:", auditErr);
    }

    return { ok: true, message: "Your password has been changed successfully!" };
  } catch (err: unknown) {
    console.error("changeCustomerPasswordAction error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "An unexpected error occurred." };
  }
}
