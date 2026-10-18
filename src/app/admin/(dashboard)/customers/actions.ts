// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Server Actions for Client History, Installments & File Extraction
// ==============================================================================

"use server";

import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type {
  CustomerProfile,
  InstallmentApplication,
  InstallmentSchedule,
  InstallmentPayment,
  CustomerPackage,
  ClientAppointmentItem,
  CompleteClientFile,
} from "./types";
import {
  buildUnifiedPaymentHistory,
  buildCompleteClientFile,
  roundCurrency,
  determineScheduleStatus,
} from "@/lib/customers/customer-history-engine";

/**
 * 1. FETCH COMPLETE CLIENT FILE
 * Authoritative, server-enforced retrieval of a client's entire file across
 * profile, contracts, schedules, payments, appointments, packages, and activity.
 */
export async function getCompleteClientFile(customerId: string): Promise<{
  success: boolean;
  data?: CompleteClientFile;
  error?: string;
}> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  // RBAC Permission Check
  const canView =
    (await hasServerPermission("customers.view")) ||
    (await hasServerPermission("customers.view_history"));

  if (!canView) {
    return { success: false, error: "Access denied. Insufficient permissions to view client history." };
  }

  try {
    // 1. Fetch Customer Profile
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("*, branches(name)")
      .eq("id", customerId)
      .single();

    if (custErr || !customer) {
      return { success: false, error: "Client record not found." };
    }

    const isSuperAdmin = staff.role === "super_admin" || staff.role === "owner";
    const branchScope = isSuperAdmin ? "Company-Wide" : "Assigned Branch";

    const clientProfile: CustomerProfile = {
      id: customer.id,
      customer_code: customer.customer_code || `CUST-${customer.id.slice(0, 6).toUpperCase()}`,
      first_name: customer.first_name,
      last_name: customer.last_name,
      full_name: `${customer.first_name} ${customer.last_name}`.trim(),
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      birthday: customer.birthday,
      gender: customer.gender,
      medical_conditions: customer.medical_conditions,
      allergies: customer.allergies,
      is_pregnant: customer.is_pregnant,
      emergency_contact: customer.emergency_contact,
      branch_id: customer.branch_id,
      branch_name: customer.branches?.name || null,
      account_status: customer.account_status || "active",
      loyalty_points: customer.loyalty_points || 0,
      created_at: customer.created_at,
    };

    // 2. Fetch Installment Applications
    let appQuery = supabase
      .from("installment_applications")
      .select(`
        *,
        branches(name),
        treatments(name),
        staff:approved_by(full_name)
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    // Branch isolation for non-super admins:
    if (!isSuperAdmin && staff.branchId) {
      appQuery = appQuery.or(`branch_id.eq.${staff.branchId},branch_id.is.null`);
    }

    const { data: rawApps } = await appQuery;

    // 3. Fetch Installment Schedules
    const appIds = (rawApps || []).map((a: any) => a.id);
    let rawSchedules: any[] = [];
    if (appIds.length > 0) {
      const { data: schedData } = await supabase
        .from("installment_schedules")
        .select("*")
        .in("application_id", appIds)
        .order("installment_number", { ascending: true });
      rawSchedules = schedData || [];
    }

    // 4. Fetch Installment Payments
    let rawInstallmentPayments: any[] = [];
    if (appIds.length > 0) {
      const { data: payData } = await supabase
        .from("installment_payments")
        .select(`
          *,
          branches(name),
          staff:received_by(full_name),
          installment_applications(application_number)
        `)
        .eq("customer_id", customerId)
        .order("payment_date", { ascending: false });
      rawInstallmentPayments = payData || [];
    }

    // Map Installment Applications with their nested schedules
    const applications: InstallmentApplication[] = (rawApps || []).map((a: any) => {
      const schedulesForApp: InstallmentSchedule[] = rawSchedules
        .filter((s) => s.application_id === a.id)
        .map((s) => ({
          id: s.id,
          application_id: s.application_id,
          installment_number: s.installment_number,
          due_date: s.due_date,
          scheduled_amount: roundCurrency(Number(s.scheduled_amount)),
          amount_paid: roundCurrency(Number(s.amount_paid)),
          remaining_amount: roundCurrency(Number(s.remaining_amount)),
          payment_date: s.payment_date,
          status: determineScheduleStatus(s.due_date, Number(s.scheduled_amount), Number(s.amount_paid)),
          notes: s.notes,
          created_at: s.created_at,
          updated_at: s.updated_at,
        }));

      const paymentsForApp: InstallmentPayment[] = rawInstallmentPayments
        .filter((p) => p.application_id === a.id)
        .map((p) => ({
          id: p.id,
          payment_number: p.payment_number,
          application_id: p.application_id,
          application_number: p.installment_applications?.application_number || a.application_number,
          customer_id: p.customer_id,
          schedule_id: p.schedule_id,
          installment_number: p.installment_number,
          amount_paid: roundCurrency(Number(p.amount_paid)),
          payment_method: p.payment_method,
          payment_date: p.payment_date,
          branch_id: p.branch_id,
          branch_name: p.branches?.name || "Main Clinic",
          received_by: p.received_by,
          received_by_name: p.staff?.full_name || null,
          shift_id: p.shift_id,
          receipt_number: p.receipt_number,
          reference_number: p.reference_number,
          transaction_reference: p.transaction_reference,
          status: p.status,
          reversed_at: p.reversed_at,
          reversed_by: p.reversed_by,
          reversal_reason: p.reversal_reason,
          notes: p.notes,
          created_at: p.created_at,
        }));

      const validPaid = paymentsForApp
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount_paid, 0);

      const contractTotal = roundCurrency(Number(a.original_contract_amount));
      const outstanding = roundCurrency(Math.max(0, contractTotal - validPaid));

      return {
        id: a.id,
        application_number: a.application_number,
        customer_id: a.customer_id,
        branch_id: a.branch_id,
        branch_name: a.branches?.name || "Main Clinic",
        service_package_name: a.service_package_name,
        treatment_id: a.treatment_id,
        treatment_name: a.treatments?.name || null,
        original_contract_amount: contractTotal,
        down_payment_required: roundCurrency(Number(a.down_payment_required)),
        down_payment_received: roundCurrency(Number(a.down_payment_received)),
        frequency: a.frequency,
        installment_amount: roundCurrency(Number(a.installment_amount)),
        number_of_installments: Number(a.number_of_installments),
        contract_start_date: a.contract_start_date,
        contract_end_date: a.contract_end_date,
        status: a.status,
        approval_status: a.approval_status,
        approved_by: a.approved_by,
        approved_by_name: a.staff?.full_name || null,
        approved_at: a.approved_at,
        notes: a.notes,
        created_at: a.created_at,
        updated_at: a.updated_at,
        valid_payments_total: validPaid,
        outstanding_balance: outstanding,
        schedules: schedulesForApp,
        payments: paymentsForApp,
      };
    });

    // 5. Fetch POS Retail Sales for this Customer
    const { data: rawPosSales } = await supabase
      .from("pos_sales")
      .select("id, reference_number, total_amount, payment_method, status, created_at, shift_id, branches(name)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    const posSales = (rawPosSales || []).map((s: any) => ({
      id: s.id,
      reference_number: s.reference_number,
      total_amount: roundCurrency(Number(s.total_amount)),
      payment_method: s.payment_method,
      status: s.status,
      created_at: s.created_at,
      branch_name: s.branches?.name || "Main Clinic",
      shift_id: s.shift_id,
    }));

    // 6. Fetch Appointments for this Customer
    const { data: rawAppointments } = await supabase
      .from("appointments")
      .select("id, reference_number, appointment_date, appointment_time, payment_status, payment_method, amount_due, status, notes, created_at, treatments(name), branches(name)")
      .eq("customer_id", customerId)
      .order("appointment_date", { ascending: false });

    const appointments: ClientAppointmentItem[] = (rawAppointments || []).map((a: any) => ({
      id: a.id,
      reference_number: a.reference_number,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      treatment_name: a.treatments?.name || "Clinic Treatment",
      branch_name: a.branches?.name || "Main Clinic",
      status: a.status,
      payment_method: a.payment_method,
      payment_status: a.payment_status,
      amount_due: roundCurrency(Number(a.amount_due)),
      notes: a.notes,
      created_at: a.created_at,
    }));

    // 7. Fetch Customer Packages & Memberships
    const { data: rawPackages } = await supabase
      .from("customer_packages")
      .select("*, treatments(name), branches(name)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    const packages: CustomerPackage[] = (rawPackages || []).map((pkg: any) => ({
      id: pkg.id,
      customer_id: pkg.customer_id,
      package_name: pkg.package_name,
      treatment_id: pkg.treatment_id,
      treatment_name: pkg.treatments?.name || null,
      branch_id: pkg.branch_id,
      branch_name: pkg.branches?.name || "Main Clinic",
      total_sessions: Number(pkg.total_sessions),
      sessions_remaining: Number(pkg.sessions_remaining),
      price_paid: roundCurrency(Number(pkg.price_paid)),
      start_date: pkg.start_date,
      expiry_date: pkg.expiry_date,
      status: pkg.status,
      notes: pkg.notes,
      created_at: pkg.created_at,
    }));

    // 8. Build Unified Deduplicated Payments
    const allInstallmentPaymentsFlat: InstallmentPayment[] = applications.flatMap((a) => a.payments || []);
    const unifiedPayments = buildUnifiedPaymentHistory({
      installmentPayments: allInstallmentPaymentsFlat,
      posSales,
      appointments: (rawAppointments || []).map((a: any) => ({
        id: a.id,
        reference_number: a.reference_number,
        amount_due: roundCurrency(Number(a.amount_due)),
        payment_method: a.payment_method,
        payment_status: a.payment_status,
        created_at: a.created_at,
        branch_name: a.branches?.name || "Main Clinic",
      })),
    });

    // 9. Build Consolidated File
    const completeFile = buildCompleteClientFile({
      client: clientProfile,
      applications,
      payments: unifiedPayments,
      appointments,
      packages,
      actorName: staff.fullName,
      branchScope,
    });

    // 10. Audit Log (View Record)
    await supabase.from("client_audit_logs").insert({
      action: "CLIENT_HISTORY_VIEWED",
      customer_id: customerId,
      actor_id: staff.id,
      export_type: "VIEW",
      branch_id: staff.branchId || null,
      metadata: {
        client_code: clientProfile.customer_code,
        actor: staff.fullName,
      },
    });

    return { success: true, data: completeFile };
  } catch (err: any) {
    console.error("Error retrieving client history:", err);
    return { success: false, error: err.message || "Failed to load client file." };
  }
}

/**
 * 2. REGISTER AN INSTALLMENT APPLICATION
 */
export async function createInstallmentApplication(formData: {
  customer_id: string;
  branch_id?: string | null;
  service_package_name: string;
  treatment_id?: string | null;
  original_contract_amount: number;
  down_payment_required?: number;
  down_payment_received?: number;
  frequency: "weekly" | "bi_weekly" | "semi_monthly" | "monthly" | "quarterly" | "custom";
  number_of_installments: number;
  contract_start_date: string;
  notes?: string;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const canCreate =
    (await hasServerPermission("installments.create")) ||
    (await hasServerPermission("customers.edit"));

  if (!canCreate) {
    return { success: false, error: "Access denied. Insufficient permissions to create installment application." };
  }

  const contractTotal = roundCurrency(Number(formData.original_contract_amount));
  const dpRequired = roundCurrency(Number(formData.down_payment_required || 0));
  const dpReceived = roundCurrency(Number(formData.down_payment_received || 0));
  const numInstallments = Math.max(1, Number(formData.number_of_installments));

  if (contractTotal <= 0) {
    return { success: false, error: "Contract amount must be greater than zero." };
  }

  const financedAmount = Math.max(0, contractTotal - dpReceived);
  const installmentAmount = roundCurrency(financedAmount / numInstallments);

  // Generate unique application number
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const applicationNumber = `INST-${year}-${randomSuffix}`;

  try {
    // 1. Insert Application
    const { data: app, error: appErr } = await supabase
      .from("installment_applications")
      .insert({
        application_number: applicationNumber,
        customer_id: formData.customer_id,
        branch_id: formData.branch_id || staff.branchId || null,
        service_package_name: formData.service_package_name.trim(),
        treatment_id: formData.treatment_id || null,
        original_contract_amount: contractTotal,
        down_payment_required: dpRequired,
        down_payment_received: dpReceived,
        frequency: formData.frequency,
        installment_amount: installmentAmount,
        number_of_installments: numInstallments,
        contract_start_date: formData.contract_start_date,
        status: "active",
        approval_status: "approved",
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        notes: formData.notes?.trim() || null,
      })
      .select()
      .single();

    if (appErr || !app) {
      throw new Error(appErr?.message || "Failed to create application record.");
    }

    // 2. Generate Installment Schedules
    const schedules = [];
    const [startYear, startMonth, startDay] = formData.contract_start_date.split("-").map(Number);
    const currentDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));

    for (let i = 1; i <= numInstallments; i++) {
      // Advance date according to frequency
      if (formData.frequency === "weekly") {
        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
      } else if (formData.frequency === "bi_weekly") {
        currentDate.setUTCDate(currentDate.getUTCDate() + 14);
      } else if (formData.frequency === "semi_monthly") {
        currentDate.setUTCDate(currentDate.getUTCDate() + 15);
      } else if (formData.frequency === "monthly") {
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      } else if (formData.frequency === "quarterly") {
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 3);
      } else {
        currentDate.setUTCDate(currentDate.getUTCDate() + 30);
      }

      const dueDateStr = currentDate.toISOString().slice(0, 10);

      schedules.push({
        application_id: app.id,
        installment_number: i,
        due_date: dueDateStr,
        scheduled_amount: installmentAmount,
        amount_paid: 0,
        remaining_amount: installmentAmount,
        status: "upcoming",
      });
    }

    const { error: schedErr } = await supabase.from("installment_schedules").insert(schedules);
    if (schedErr) {
      console.warn("Could not insert schedules into DB table, ignoring if table not created yet:", schedErr.message);
    }

    // 3. Log Audit
    await supabase.from("client_audit_logs").insert({
      action: "INSTALLMENT_APPLICATION_CREATED",
      customer_id: formData.customer_id,
      actor_id: staff.id,
      branch_id: formData.branch_id || staff.branchId || null,
      metadata: {
        application_number: applicationNumber,
        contract_amount: contractTotal,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true, application: app };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to register installment application." };
  }
}

/**
 * 3. RECORD INSTALLMENT PAYMENT
 */
export async function recordInstallmentPayment(formData: {
  application_id: string;
  customer_id: string;
  schedule_id?: string | null;
  installment_number?: number | null;
  amount_paid: number;
  payment_method: string;
  payment_date?: string;
  receipt_number?: string;
  transaction_reference?: string;
  notes?: string;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const canPay =
    (await hasServerPermission("installments.pay")) ||
    (await hasServerPermission("pos.process_payment"));

  if (!canPay) {
    return { success: false, error: "Access denied. Insufficient permissions to record payment." };
  }

  const paymentAmount = roundCurrency(Number(formData.amount_paid));
  if (paymentAmount <= 0) {
    return { success: false, error: "Payment amount must be greater than zero." };
  }

  try {
    // Generate payment number
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const paymentNumber = `PAY-${year}-${rand}`;

    // Active shift check for cashier drawer integration
    let activeShiftId: string | null = null;
    const { data: shift } = await supabase
      .from("cashier_shifts")
      .select("id")
      .eq("cashier_id", staff.id)
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shift) {
      activeShiftId = shift.id;
    }

    const { data: payment, error: payErr } = await supabase
      .from("installment_payments")
      .insert({
        payment_number: paymentNumber,
        application_id: formData.application_id,
        customer_id: formData.customer_id,
        schedule_id: formData.schedule_id || null,
        installment_number: formData.installment_number || null,
        amount_paid: paymentAmount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date || new Date().toISOString(),
        branch_id: staff.branchId || null,
        received_by: staff.id,
        shift_id: activeShiftId,
        receipt_number: formData.receipt_number?.trim() || null,
        transaction_reference: formData.transaction_reference?.trim() || null,
        status: "completed",
        notes: formData.notes?.trim() || null,
      })
      .select()
      .single();

    if (payErr || !payment) {
      throw new Error(payErr?.message || "Failed to record payment.");
    }

    // Update Schedule if specified
    if (formData.schedule_id) {
      const { data: sched } = await supabase
        .from("installment_schedules")
        .select("scheduled_amount, amount_paid")
        .eq("id", formData.schedule_id)
        .single();

      if (sched) {
        const curPaid = roundCurrency(Number(sched.amount_paid || 0));
        const newPaid = roundCurrency(curPaid + paymentAmount);
        const schedAmount = roundCurrency(Number(sched.scheduled_amount));
        const remaining = roundCurrency(Math.max(0, schedAmount - newPaid));
        const newStatus = newPaid >= schedAmount ? "paid" : "partially_paid";

        await supabase
          .from("installment_schedules")
          .update({
            amount_paid: newPaid,
            remaining_amount: remaining,
            status: newStatus,
            payment_date: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
          })
          .eq("id", formData.schedule_id);
      }
    }

    // Audit Log
    await supabase.from("client_audit_logs").insert({
      action: "INSTALLMENT_PAYMENT_RECORDED",
      customer_id: formData.customer_id,
      actor_id: staff.id,
      branch_id: staff.branchId || null,
      metadata: {
        payment_number: paymentNumber,
        amount: paymentAmount,
        application_id: formData.application_id,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true, payment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record payment." };
  }
}

/**
 * 4. REVERSE AN INSTALLMENT PAYMENT
 */
export async function reverseInstallmentPayment(paymentId: string, reason: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const canReverse =
    staff.role === "super_admin" ||
    staff.role === "owner" ||
    staff.role === "admin" ||
    (await hasServerPermission("installments.reverse"));

  if (!canReverse) {
    return { success: false, error: "Access denied. Only Super Admin or authorized manager may reverse installment payments." };
  }

  if (!reason || !reason.trim()) {
    return { success: false, error: "A valid reversal reason is required." };
  }

  try {
    const { data: payment, error: pErr } = await supabase
      .from("installment_payments")
      .select("*, installment_schedules(*)")
      .eq("id", paymentId)
      .single();

    if (pErr || !payment) {
      return { success: false, error: "Payment record not found." };
    }

    if (payment.status === "reversed") {
      return { success: false, error: "Payment has already been reversed." };
    }

    // Mark payment reversed
    await supabase
      .from("installment_payments")
      .update({
        status: "reversed",
        reversed_at: new Date().toISOString(),
        reversed_by: staff.id,
        reversal_reason: reason.trim(),
      })
      .eq("id", paymentId);

    // Rollback schedule if linked
    if (payment.schedule_id && payment.installment_schedules) {
      const curPaid = roundCurrency(Number(payment.installment_schedules.amount_paid));
      const payAmount = roundCurrency(Number(payment.amount_paid));
      const rolledPaid = roundCurrency(Math.max(0, curPaid - payAmount));
      const schedAmount = roundCurrency(Number(payment.installment_schedules.scheduled_amount));
      const remaining = roundCurrency(Math.max(0, schedAmount - rolledPaid));
      const status = determineScheduleStatus(payment.installment_schedules.due_date, schedAmount, rolledPaid);

      await supabase
        .from("installment_schedules")
        .update({
          amount_paid: rolledPaid,
          remaining_amount: remaining,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.schedule_id);
    }

    // Audit Log
    await supabase.from("client_audit_logs").insert({
      action: "INSTALLMENT_PAYMENT_REVERSED",
      customer_id: payment.customer_id,
      actor_id: staff.id,
      branch_id: staff.branchId || null,
      metadata: {
        payment_id: paymentId,
        payment_number: payment.payment_number,
        amount: payment.amount_paid,
        reason: reason.trim(),
      },
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reverse payment." };
  }
}

/**
 * 5. AUDIT LOG EXPORT ACTION
 */
export async function logClientFileExport(customerId: string, exportType: "PDF" | "EXCEL" | "STATEMENT") {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    await supabase.from("client_audit_logs").insert({
      action: "CLIENT_FILE_EXPORTED",
      customer_id: customerId,
      actor_id: staff.id,
      export_type: exportType,
      branch_id: staff.branchId || null,
      metadata: {
        actor: staff.fullName,
        role: staff.role,
        timestamp: new Date().toISOString(),
      },
    });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to log export audit:", err);
    return { success: false };
  }
}
