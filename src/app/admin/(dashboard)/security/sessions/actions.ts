"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function forceLogoutSession(sessionId: string) {
  const currentUser = await requireStaff();
  const canForceLogout = await hasServerPermission("security.force_logout");
  
  if (!canForceLogout) {
    return { error: "You do not have permission to force logout users." };
  }

  const supabaseAdmin = createAdminClient();

  // 1. Get the session details first
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("user_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionData) {
    return { error: "Session not found." };
  }

  const logoutAt = new Date();
  const loginAt = new Date(sessionData.login_at);
  const durationSeconds = Math.floor((logoutAt.getTime() - loginAt.getTime()) / 1000);

  // 2. Mark the session as force logged out
  const { error: updateError } = await supabaseAdmin
    .from("user_sessions")
    .update({ 
      status: "FORCE_LOGGED_OUT",
      logout_at: logoutAt.toISOString(),
      logout_reason: "ADMIN_FORCE_LOGOUT",
      terminated_by: currentUser.id,
      duration_seconds: durationSeconds
    })
    .eq("id", sessionId);

  if (updateError) {
    return { error: "Failed to update session status." };
  }
  
  // 3. Log the auth event
  await supabaseAdmin.from("auth_events").insert({
    user_id: currentUser.id, // The actor who triggered the event
    target_user_id: sessionData.user_id, // The user whose session was terminated
    branch_id: sessionData.branch_id,
    session_id: sessionId,
    event_type: "FORCE_LOGOUT",
    outcome: "SUCCESS",
    ip_address: sessionData.ip_address,
    user_agent: sessionData.user_agent,
    device_type: sessionData.device_type,
    browser: sessionData.browser,
    operating_system: sessionData.operating_system,
    source: "ADMIN_ACTION",
    metadata: { 
      duration_seconds: durationSeconds,
      action: "Administrator forced session termination"
    }
  });

  revalidatePath("/admin/security/sessions");
  revalidatePath("/admin/security/logins");
  revalidatePath("/admin/audit-logs");
  
  return { success: true };
}
