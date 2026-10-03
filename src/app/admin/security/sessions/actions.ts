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
    .select("user_id, branch_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionData) {
    return { error: "Session not found." };
  }

  // 2. Mark the session as force logged out
  const { error: updateError } = await supabaseAdmin
    .from("user_sessions")
    .update({ 
      status: "FORCE_LOGGED_OUT",
      logout_at: new Date().toISOString(),
      logout_reason: `Forced out by ${currentUser.id}`
    })
    .eq("id", sessionId);

  if (updateError) {
    return { error: "Failed to update session status." };
  }

  // Note: While we update the session record here, to truly forcefully log someone out
  // across devices instantly without requiring them to refresh, we would need to invalidate
  // their JWT or use Supabase's admin signOut API if available. 
  // Supabase Auth Admin doesn't easily let you expire a specific session via API directly,
  // but we can update the user's metadata or sign out all their sessions if critical.
  // For this implementation, we rely on the session table status and optionally a client-side listener.
  
  // 3. Log the audit event
  await supabaseAdmin.from("audit_logs").insert({
    user_id: currentUser.id,
    action: "FORCE_LOGOUT",
    resource_type: "user_sessions",
    resource_id: sessionData.user_id,
    branch_id: sessionData.branch_id,
    metadata: { 
      session_id: sessionId,
      action: "Administrator forced session termination"
    }
  });

  revalidatePath("/admin/security/sessions");
  revalidatePath("/admin/security/logins");
  revalidatePath("/admin/audit-logs");
  
  return { success: true };
}
