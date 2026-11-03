"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function sellCustomerPackage(data: {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  treatmentId?: string;
  packageName: string;
  branchId?: string;
  totalSessions: number;
  pricePaid: number;
  paymentMethod?: string;
  expiryMonths?: number;
  notes?: string;
}) {
  const staff = await requireStaff();
  const canCreate = await hasServerPermission("packages.create");
  if (!canCreate && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager" && staff.role !== "cashier") {
    return { error: "Forbidden: You do not have permission to sell or assign packages." };
  }

  const supabase = createAdminClient();

  // 1. Resolve customer
  let resolvedCustomerId = data.customerId;
  if (!resolvedCustomerId && data.customerPhone) {
    const { data: existingCust } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", data.customerPhone)
      .maybeSingle();

    if (existingCust) {
      resolvedCustomerId = existingCust.id;
    } else if (data.customerName) {
      const parts = data.customerName.trim().split(" ");
      const firstName = parts[0] || "Customer";
      const lastName = parts.slice(1).join(" ") || "";
      const { data: newCust, error: newCustErr } = await supabase
        .from("customers")
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: data.customerPhone,
          email: `pkg-${Date.now()}@cindyrellaclinic.com`,
          client_classification: "walk-in"
        })
        .select("id")
        .single();

      if (newCustErr || !newCust) {
        return { error: "Failed to create customer record for this package." };
      }
      resolvedCustomerId = newCust.id;
    }
  }

  if (!resolvedCustomerId) {
    return { error: "Please select an existing customer or enter their name and phone number." };
  }

  // 2. Compute expiry date (default 12 months)
  const months = Number(data.expiryMonths) || 12;
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);
  const expiryDateStr = expiryDate.toISOString().slice(0, 10);
  const startDateStr = new Date().toISOString().slice(0, 10);

  const totalSessions = Math.max(1, Number(data.totalSessions) || 6);

  // 3. Insert customer package
  const { data: pkg, error: pkgError } = await supabase
    .from("customer_packages")
    .insert({
      customer_id: resolvedCustomerId,
      package_name: data.packageName,
      treatment_id: data.treatmentId || null,
      branch_id: data.branchId || staff.branchId || null,
      total_sessions: totalSessions,
      sessions_remaining: totalSessions,
      price_paid: Math.max(0, Number(data.pricePaid) || 0),
      start_date: startDateStr,
      expiry_date: expiryDateStr,
      status: "active",
      notes: data.notes ? `[Notes: ${data.notes}]` : null,
    })
    .select("id")
    .single();

  if (pkgError || !pkg) {
    console.error("Failed to sell package:", pkgError);
    return { error: pkgError?.message || "Failed to create customer package." };
  }

  // 4. Log in client audit logs
  try {
    await supabase.from("client_audit_logs").insert({
      customer_id: resolvedCustomerId,
      actor_id: staff.id,
      action: "PACKAGE_PURCHASED",
      export_type: "CREATE",
      branch_id: data.branchId || staff.branchId || null,
      metadata: {
        actor: staff.fullName,
        package_name: data.packageName,
        total_sessions: totalSessions,
        price_paid: data.pricePaid,
        payment_method: data.paymentMethod || "cash",
      },
    });
  } catch (logErr) {
    console.error("Failed to log package purchase:", logErr);
  }

  revalidatePath("/admin/packages");
  revalidatePath("/admin/customers");
  return { success: true, packageId: pkg.id };
}

export async function redeemPackageSession(data: {
  packageId: string;
  staffId?: string;
  notes?: string;
  branchId?: string;
}) {
  const staff = await requireStaff();
  const canRedeem = await hasServerPermission("packages.redeem");
  if (!canRedeem && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager" && staff.role !== "staff" && staff.role !== "cashier") {
    return { error: "Forbidden: You do not have permission to redeem package sessions." };
  }

  const supabase = createAdminClient();

  // 1. Fetch current package state
  const { data: pkg, error: fetchErr } = await supabase
    .from("customer_packages")
    .select("*, customer:customer_id(first_name, last_name, phone)")
    .eq("id", data.packageId)
    .single();

  if (fetchErr || !pkg) {
    return { error: "Customer package not found." };
  }

  if (pkg.status !== "active") {
    return { error: `This package is currently ${pkg.status} and cannot be redeemed.` };
  }

  if (pkg.sessions_remaining <= 0) {
    return { error: "This package has no remaining sessions." };
  }

  // Check expiration
  if (pkg.expiry_date && new Date(pkg.expiry_date) < new Date()) {
    await supabase.from("customer_packages").update({ status: "expired" }).eq("id", pkg.id);
    return { error: "This package has already expired." };
  }

  // 2. Calculate new remaining sessions
  const newRemaining = pkg.sessions_remaining - 1;
  const sessionNum = pkg.total_sessions - newRemaining;
  const newStatus = newRemaining === 0 ? "fully_redeemed" : "active";

  // Fetch attending staff name
  let handlerName = staff.fullName;
  if (data.staffId && data.staffId !== staff.id) {
    const { data: handler } = await supabase
      .from("staff")
      .select("full_name")
      .eq("id", data.staffId)
      .maybeSingle();
    if (handler) handlerName = handler.full_name;
  }

  const redemptionDateStr = new Date().toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const redemptionEntry = `[Session ${sessionNum}/${pkg.total_sessions} redeemed on ${redemptionDateStr} by ${handlerName}${data.notes ? `: ${data.notes}` : ""}]`;
  const existingNotes = pkg.notes || "";
  const updatedNotes = existingNotes ? `${existingNotes}\n${redemptionEntry}` : redemptionEntry;

  // 3. Update customer package
  const { error: updateErr } = await supabase
    .from("customer_packages")
    .update({
      sessions_remaining: newRemaining,
      status: newStatus,
      notes: updatedNotes,
      updated_at: new Date().toISOString()
    })
    .eq("id", pkg.id);

  if (updateErr) {
    return { error: updateErr.message };
  }

  // 4. Log in client audit logs
  try {
    await supabase.from("client_audit_logs").insert({
      customer_id: pkg.customer_id,
      actor_id: staff.id,
      action: "PACKAGE_SESSION_REDEEMED",
      export_type: "UPDATE",
      branch_id: data.branchId || pkg.branch_id || staff.branchId || null,
      metadata: {
        actor: staff.fullName,
        handler: handlerName,
        package_name: pkg.package_name,
        session_number: sessionNum,
        total_sessions: pkg.total_sessions,
        remaining_sessions: newRemaining,
        notes: data.notes || null,
      },
    });
  } catch (logErr) {
    console.error("Failed to log package redemption:", logErr);
  }

  // 5. Try inserting into package_redemptions if table exists
  try {
    await supabase.from("package_redemptions").insert({
      customer_package_id: pkg.id,
      session_number: sessionNum,
      branch_id: data.branchId || pkg.branch_id || staff.branchId || null,
      performed_by: data.staffId || staff.id,
      notes: data.notes || null,
    });
  } catch {
    // Graceful fallback if migration 0048 not yet executed in remote DB
  }

  revalidatePath("/admin/packages");
  revalidatePath("/admin/customers");
  return { 
    success: true, 
    sessionNumber: sessionNum, 
    remainingSessions: newRemaining, 
    status: newStatus 
  };
}

export async function updatePackageStatus(data: {
  packageId: string;
  status: "active" | "fully_redeemed" | "expired" | "cancelled";
  extensionMonths?: number;
  notes?: string;
}) {
  const staff = await requireStaff();
  if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: Only management can modify package status." };
  }

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    status: data.status,
    updated_at: new Date().toISOString()
  };

  if (data.extensionMonths && data.extensionMonths > 0) {
    const { data: pkg } = await supabase
      .from("customer_packages")
      .select("expiry_date")
      .eq("id", data.packageId)
      .single();

    const currentExpiry = pkg?.expiry_date ? new Date(pkg.expiry_date) : new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + data.extensionMonths);
    updates.expiry_date = currentExpiry.toISOString().slice(0, 10);
  }

  if (data.notes) {
    const { data: pkg } = await supabase
      .from("customer_packages")
      .select("notes")
      .eq("id", data.packageId)
      .single();
    updates.notes = pkg?.notes ? `${pkg.notes}\n[Admin note: ${data.notes}]` : `[Admin note: ${data.notes}]`;
  }

  const { error } = await supabase
    .from("customer_packages")
    .update(updates)
    .eq("id", data.packageId);

  if (error) return { error: error.message };

  revalidatePath("/admin/packages");
  return { success: true };
}

