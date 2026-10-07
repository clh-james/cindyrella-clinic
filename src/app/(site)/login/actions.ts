"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // We could log LOGIN_FAILED here if we wanted to
    return { error: error?.message || "Incorrect email or password." };
  }

  // Session Tracking for Customer
  try {
    const adminClient = createAdminClient();
    
    // Parse headers for device info
    const reqHeaders = await headers();
    const userAgentStr = reqHeaders.get("user-agent") || "";
    let ipAddressStr = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip");
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

    // Insert user session
    const { data: sessionData, error: sessionError } = await adminClient.from("user_sessions").insert({
      user_id: data.user.id,
      branch_id: null, // Customers don't have a branch_id typically in this context
      ip_address: ipAddressStr,
      user_agent: userAgentStr,
      device_type: deviceType,
      device_name: deviceName,
      browser: browserName,
      operating_system: osName,
      status: "ACTIVE"
    }).select("id").single();

    if (!sessionError && sessionData) {
      await adminClient.from("auth_events").insert({
        user_id: data.user.id,
        branch_id: null,
        session_id: sessionData.id,
        event_type: "LOGIN_SUCCESS",
        outcome: "SUCCESS",
        ip_address: ipAddressStr,
        user_agent: userAgentStr,
        device_type: deviceType,
        browser: browserName,
        operating_system: osName,
        metadata: { login_method: "password", user_type: "customer" }
      });
    }
  } catch (err) {
    console.error("Failed to log customer session:", err);
  }

  redirect("/account");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;

  const supabase = await createClient();
  
  // Register user with Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Registration failed" };
  }

  // Create customer profile in database
  const { error: profileError } = await supabase.from("customers").insert({
    auth_id: authData.user.id,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    loyalty_points: 0,
  });

  if (profileError) {
    return { error: "Profile creation failed. Please contact support." };
  }

  // Let's log the sign up as an auth event
  try {
    const adminClient = createAdminClient();
    await adminClient.from("auth_events").insert({
      user_id: authData.user.id,
      event_type: "ACCOUNT_ENABLED",
      outcome: "SUCCESS",
      source: "APPLICATION",
      metadata: { action: "customer_registration" }
    });
  } catch (e) {
    console.error(e);
  }

  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  
  // Get current user before signing out to update their session
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const adminClient = createAdminClient();
    
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
          logout_reason: "USER_LOGOUT",
          duration_seconds: durationSeconds
        })
        .eq("id", activeSession.id);

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
        metadata: { duration_seconds: durationSeconds, user_type: "customer" }
      });
    }
  }

  await supabase.auth.signOut();
  redirect("/login");
}
