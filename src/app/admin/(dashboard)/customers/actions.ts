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
  CustomerPhotoRecord,
  CustomerWaiverRecord,
  ClinicalChartRecord,
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
export async function getCompleteClientFile(
  customerId: string,
  filters?: { fromDate?: string; toDate?: string; branchId?: string }
): Promise<{
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

    // 5. Fetch POS Retail Sales for this Customer with item-level details
    let posQuery = supabase
      .from("pos_sales")
      .select("*, branches(name), pos_sale_items(*, inventory_items(name, sku))")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (filters?.branchId && filters.branchId !== "all") {
      posQuery = posQuery.eq("branch_id", filters.branchId);
    }
    if (filters?.fromDate) {
      posQuery = posQuery.gte("created_at", `${filters.fromDate}T00:00:00Z`);
    }
    if (filters?.toDate) {
      posQuery = posQuery.lte("created_at", `${filters.toDate}T23:59:59Z`);
    }

    const { data: rawPosSales } = await posQuery;

    const posTransactions = (rawPosSales || []).map((s: any) => ({
      id: s.id,
      reference_number: s.reference_number,
      receipt_number: s.reference_number,
      transaction_date: s.created_at,
      branch_name: s.branches?.name || "Main Clinic",
      cashier_name: null,
      items: (s.pos_sale_items || []).map((it: any) => ({
        item_name: it.inventory_items?.name || "Retail Merchandise Item",
        sku: it.inventory_items?.sku || null,
        quantity: Number(it.quantity || 1),
        price_per_unit: roundCurrency(Number(it.price_per_unit || 0)),
        subtotal: roundCurrency(Number(it.quantity || 1) * Number(it.price_per_unit || 0)),
      })),
      total_amount: roundCurrency(Number(s.total_amount)),
      discount_amount: roundCurrency(Number(s.discount_amount || 0)),
      discount_reason: s.discount_reason || null,
      payment_method: s.payment_method || "cash",
      status: s.status || "completed",
      refunded_amount: roundCurrency(Number(s.refunded_amount || 0)),
      void_reason: s.void_reason || null,
    }));

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

    // 8.5 Fetch Customer Before & After Photos
    let customerPhotos: CustomerPhotoRecord[] = [];
    try {
      const { data: photoData, error: photoErr } = await supabase
        .from("customer_photos")
        .select("*")
        .eq("customer_id", customerId)
        .order("date_taken", { ascending: false });

      if (!photoErr && photoData) {
        customerPhotos = photoData as CustomerPhotoRecord[];
      }
    } catch {
      customerPhotos = [];
    }

    // 8.6 Fetch Customer Consent Waivers
    let customerWaivers: CustomerWaiverRecord[] = [];
    try {
      const { data: waiverData, error: waiverErr } = await supabase
        .from("customer_waivers")
        .select("*")
        .eq("customer_id", customerId)
        .order("signed_at", { ascending: false });

      if (!waiverErr && waiverData) {
        customerWaivers = waiverData as CustomerWaiverRecord[];
      }
    } catch {
      customerWaivers = [];
    }

    // 8.7 Fetch Clinical Treatment Charts (EMR)
    let customerCharts: ClinicalChartRecord[] = [];
    try {
      const { data: chartData, error: chartErr } = await supabase
        .from("clinical_treatment_charts")
        .select("*")
        .eq("customer_id", customerId)
        .order("chart_date", { ascending: false });

      if (!chartErr && chartData) {
        customerCharts = chartData as ClinicalChartRecord[];
      }
    } catch {
      customerCharts = [];
    }

    // 9. Build Consolidated File
    const completeFile = buildCompleteClientFile({
      client: clientProfile,
      applications,
      payments: unifiedPayments,
      appointments,
      packages,
      posTransactions,
      photos: customerPhotos,
      waivers: customerWaivers,
      charts: customerCharts,
      actorName: staff.fullName,
      branchScope,
      date_range: filters?.fromDate || filters?.toDate ? { from: filters.fromDate, to: filters.toDate } : undefined,
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
export async function logClientFileExport(
  customerId: string,
  exportType: "PDF" | "EXCEL" | "STATEMENT" | "BOTH",
  metadata?: Record<string, any>
) {
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

/**
 * 6. UPLOAD CUSTOMER BEFORE & AFTER PHOTO
 */
export async function uploadCustomerPhoto(formData: FormData): Promise<{
  success: boolean;
  photo?: CustomerPhotoRecord;
  error?: string;
}> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const customerId = formData.get("customer_id") as string;
  const photoType = (formData.get("photo_type") as "before" | "after" | "progress") || "before";
  const treatmentName = (formData.get("treatment_name") as string) || "General Treatment";
  const sessionNumber = formData.get("session_number") ? parseInt(formData.get("session_number") as string) : 1;
  const dateTaken = (formData.get("date_taken") as string) || new Date().toISOString().slice(0, 10);
  const notes = (formData.get("notes") as string) || null;
  const comparisonGroupId = (formData.get("comparison_group_id") as string) || null;
  const file = formData.get("file") as File | null;

  if (!customerId) {
    return { success: false, error: "Missing customer identifier." };
  }
  if (!file || file.size === 0) {
    return { success: false, error: "Please select an image file to upload." };
  }

  try {
    // 1. Upload to Supabase Storage 'gallery'
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `customers/${customerId}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabase.storage
      .from("gallery")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return { success: false, error: `Upload failed: ${uploadErr.message}` };
    }

    // 2. Obtain Public URL
    const { data: urlData } = supabase.storage
      .from("gallery")
      .getPublicUrl(storagePath);

    const photoUrl = urlData.publicUrl;

    // 3. Save to customer_photos table
    const { data: photoRecord, error: insertErr } = await supabase
      .from("customer_photos")
      .insert({
        customer_id: customerId,
        branch_id: staff.branchId || null,
        photo_type: photoType,
        photo_url: photoUrl,
        treatment_name: treatmentName,
        session_number: sessionNumber,
        date_taken: dateTaken,
        notes: notes,
        taken_by_staff_id: staff.id,
        taken_by_name: staff.fullName,
        comparison_group_id: comparisonGroupId,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Database insert error:", insertErr);
      return { success: false, error: `Failed to save photo record: ${insertErr.message}` };
    }

    // 4. Log to Audit
    await supabase.from("client_audit_logs").insert({
      action: "CUSTOMER_PHOTO_UPLOADED",
      customer_id: customerId,
      actor_id: staff.id,
      export_type: "PHOTO_UPLOAD",
      branch_id: staff.branchId || null,
      metadata: {
        photo_id: photoRecord.id,
        photo_type: photoType,
        treatment_name: treatmentName,
        session_number: sessionNumber,
        actor: staff.fullName,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true, photo: photoRecord as CustomerPhotoRecord };
  } catch (err: any) {
    console.error("Exception during photo upload:", err);
    return { success: false, error: err.message || "Failed to process photo upload." };
  }
}

/**
 * 7. DELETE CUSTOMER PHOTO
 */
export async function deleteCustomerPhoto(photoId: string, customerId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // 1. Get photo to find storage URL
    const { data: photo } = await supabase
      .from("customer_photos")
      .select("photo_url")
      .eq("id", photoId)
      .single();

    // 2. Delete database record
    const { error: delErr } = await supabase
      .from("customer_photos")
      .delete()
      .eq("id", photoId);

    if (delErr) {
      return { success: false, error: delErr.message };
    }

    // 3. Attempt to delete from storage if url matches pattern
    if (photo?.photo_url) {
      try {
        const parts = photo.photo_url.split("/gallery/");
        if (parts[1]) {
          await supabase.storage.from("gallery").remove([decodeURIComponent(parts[1])]);
        }
      } catch (e) {
        console.warn("Storage deletion warning:", e);
      }
    }

    // 4. Audit Log
    await supabase.from("client_audit_logs").insert({
      action: "CUSTOMER_PHOTO_DELETED",
      customer_id: customerId,
      actor_id: staff.id,
      export_type: "PHOTO_DELETE",
      branch_id: staff.branchId || null,
      metadata: {
        photo_id: photoId,
        actor: staff.fullName,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete photo." };
  }
}

/**
 * 8. PAIR BEFORE & AFTER PHOTOS
 */
export async function pairCustomerPhotos(
  beforePhotoId: string,
  afterPhotoId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const groupId = crypto.randomUUID();

    const { error: err1 } = await supabase
      .from("customer_photos")
      .update({ comparison_group_id: groupId, photo_type: "before" })
      .eq("id", beforePhotoId);

    if (err1) throw err1;

    const { error: err2 } = await supabase
      .from("customer_photos")
      .update({ comparison_group_id: groupId, photo_type: "after" })
      .eq("id", afterPhotoId);

    if (err2) throw err2;

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to pair photos." };
  }
}

/**
 * 9. SAVE DIGITAL CONSENT WAIVER & MEDICAL INTAKE
 * Saves the legally binding digital waiver and automatically synchronizes
 * customer's medical conditions, allergies, and emergency contact.
 */
export async function saveCustomerWaiver(payload: {
  customer_id: string;
  appointment_id?: string | null;
  treatment_name: string;
  form_type?: string;
  medical_history: {
    allergies?: string;
    medical_conditions?: string[];
    current_medications?: string;
    is_pregnant_or_nursing?: boolean;
    past_treatments_6months?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
  consent_acknowledgements: {
    risks_acknowledged: boolean;
    aftercare_commitment: boolean;
    truthful_information: boolean;
    photo_consent: "clinical_records_only" | "promotional_permitted" | "declined";
  };
  signature_data_url: string;
  signer_full_name: string;
}): Promise<{
  success: boolean;
  waiver?: CustomerWaiverRecord;
  error?: string;
}> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  if (!payload.customer_id) {
    return { success: false, error: "Missing customer identifier." };
  }
  if (!payload.signature_data_url || payload.signature_data_url.length < 50) {
    return { success: false, error: "A valid electronic signature is required." };
  }
  if (!payload.signer_full_name?.trim()) {
    return { success: false, error: "Printed signer name is required." };
  }

  try {
    // 1. Insert into customer_waivers table
    const { data: waiver, error: insertErr } = await supabase
      .from("customer_waivers")
      .insert({
        customer_id: payload.customer_id,
        appointment_id: payload.appointment_id || null,
        branch_id: staff.branchId || null,
        treatment_name: payload.treatment_name || "General Clinical Treatment",
        form_type: payload.form_type || "general_treatment",
        waiver_mode: "digital",
        medical_history: payload.medical_history,
        consent_acknowledgements: payload.consent_acknowledgements,
        signature_data_url: payload.signature_data_url,
        signer_full_name: payload.signer_full_name.trim(),
        signed_at: new Date().toISOString(),
        staff_witness_id: staff.id,
        staff_witness_name: staff.fullName,
        status: "signed",
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Waiver insert error:", insertErr);
      return { success: false, error: `Failed to save waiver: ${insertErr.message}` };
    }

    // 2. Synchronize customer profile health disclosures in customers table
    const medHistory = payload.medical_history;
    const updateCustomerPayload: Record<string, any> = {};

    if (medHistory.allergies !== undefined) {
      updateCustomerPayload.allergies = medHistory.allergies || null;
    }
    if (Array.isArray(medHistory.medical_conditions)) {
      updateCustomerPayload.medical_conditions = medHistory.medical_conditions.join(", ") || null;
    }
    if (medHistory.is_pregnant_or_nursing !== undefined) {
      updateCustomerPayload.is_pregnant = !!medHistory.is_pregnant_or_nursing;
    }
    if (medHistory.emergency_contact_name || medHistory.emergency_contact_phone) {
      updateCustomerPayload.emergency_contact = `${medHistory.emergency_contact_name || ""} ${medHistory.emergency_contact_phone ? `(${medHistory.emergency_contact_phone})` : ""}`.trim() || null;
    }

    if (Object.keys(updateCustomerPayload).length > 0) {
      await supabase
        .from("customers")
        .update(updateCustomerPayload)
        .eq("id", payload.customer_id);
    }

    // 3. Log to audit trail
    await supabase.from("client_audit_logs").insert({
      action: "CLIENT_WAIVER_SIGNED",
      customer_id: payload.customer_id,
      actor_id: staff.id,
      export_type: "WAIVER_SIGN",
      branch_id: staff.branchId || null,
      metadata: {
        waiver_id: waiver.id,
        treatment_name: payload.treatment_name,
        signer: payload.signer_full_name,
        witness: staff.fullName,
        signed_at: waiver.signed_at,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true, waiver: waiver as CustomerWaiverRecord };
  } catch (err: any) {
    console.error("Exception in saveCustomerWaiver:", err);
    return { success: false, error: err.message || "Failed to process consent waiver." };
  }
}

/**
 * 9B. UPLOAD PHYSICAL PAPER WAIVER PHOTO
 * Uploads a picture of the signed paper waiver form, archives it,
 * and allows high-resolution download anytime.
 */
export async function uploadPaperWaiver(formData: FormData): Promise<{
  success: boolean;
  waiver?: CustomerWaiverRecord;
  error?: string;
}> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const customerId = formData.get("customer_id") as string;
  const treatmentName = (formData.get("treatment_name") as string) || "General Clinical Treatment";
  const signerFullName = (formData.get("signer_full_name") as string) || "Patient";
  const signedAt = (formData.get("signed_at") as string) || new Date().toISOString().slice(0, 10);
  const notes = (formData.get("notes") as string) || null;
  const allergies = (formData.get("allergies") as string) || null;
  const medicalConditionsStr = (formData.get("medical_conditions") as string) || null;
  const file = formData.get("file") as File | null;

  if (!customerId) {
    return { success: false, error: "Missing customer identifier." };
  }
  if (!file || file.size === 0) {
    return { success: false, error: "Please select or capture a photo of the signed paper waiver." };
  }

  try {
    // 1. Upload paper waiver photo to Supabase Storage
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = `paper-waiver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const storagePath = `waivers/${customerId}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let photoUrl = "";
    const { error: uploadErr } = await supabase.storage
      .from("gallery")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (!uploadErr) {
      const { data: urlData } = supabase.storage
        .from("gallery")
        .getPublicUrl(storagePath);
      photoUrl = urlData.publicUrl;
    } else {
      // Fallback: convert to base64 data url if bucket is unavailable
      const base64Str = buffer.toString("base64");
      photoUrl = `data:${file.type || "image/jpeg"};base64,${base64Str}`;
    }

    const conditionsArray = medicalConditionsStr
      ? medicalConditionsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // 2. Insert into customer_waivers table
    const { data: waiver, error: insertErr } = await supabase
      .from("customer_waivers")
      .insert({
        customer_id: customerId,
        branch_id: staff.branchId || null,
        treatment_name: treatmentName.trim(),
        form_type: "physical_paper_waiver",
        waiver_mode: "paper_upload",
        paper_document_url: photoUrl,
        signature_data_url: photoUrl,
        signer_full_name: signerFullName.trim(),
        signed_at: new Date(signedAt).toISOString(),
        staff_witness_id: staff.id,
        staff_witness_name: staff.fullName,
        notes: notes ? notes.trim() : "Physical signed paper waiver on file",
        status: "signed",
        medical_history: {
          allergies: allergies || undefined,
          medical_conditions: conditionsArray,
        },
        consent_acknowledgements: {
          risks_acknowledged: true,
          aftercare_commitment: true,
          truthful_information: true,
          photo_consent: "clinical_records_only",
        },
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Paper waiver database insert error:", insertErr);
      return { success: false, error: `Failed to save paper waiver: ${insertErr.message}` };
    }

    // 3. Update customer allergies/conditions if provided
    if (allergies || conditionsArray.length > 0) {
      const custUpdate: Record<string, any> = {};
      if (allergies) custUpdate.allergies = allergies;
      if (conditionsArray.length > 0) custUpdate.medical_conditions = conditionsArray.join(", ");
      await supabase.from("customers").update(custUpdate).eq("id", customerId);
    }

    // 4. Audit log
    await supabase.from("client_audit_logs").insert({
      action: "PAPER_WAIVER_UPLOADED",
      customer_id: customerId,
      actor_id: staff.id,
      export_type: "WAIVER_UPLOAD",
      branch_id: staff.branchId || null,
      metadata: {
        waiver_id: waiver.id,
        treatment_name: treatmentName,
        signer: signerFullName,
        witness: staff.fullName,
        paper_document_url: photoUrl,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true, waiver: waiver as CustomerWaiverRecord };
  } catch (err: any) {
    console.error("Exception in uploadPaperWaiver:", err);
    return { success: false, error: err.message || "Failed to upload paper waiver photo." };
  }
}

/**
 * 10. REVOKE CUSTOMER WAIVER
 */
export async function revokeCustomerWaiver(
  waiverId: string,
  customerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error: updateErr } = await supabase
      .from("customer_waivers")
      .update({ status: "revoked" })
      .eq("id", waiverId);

    if (updateErr) return { success: false, error: updateErr.message };

    await supabase.from("client_audit_logs").insert({
      action: "CLIENT_WAIVER_REVOKED",
      customer_id: customerId,
      actor_id: staff.id,
      export_type: "WAIVER_REVOKE",
      branch_id: staff.branchId || null,
      metadata: {
        waiver_id: waiverId,
        revoked_by: staff.fullName,
        reason,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to revoke waiver." };
  }
}

/**
 * 11. SAVE CLINICAL TREATMENT CHART & EMR SESSION NOTES
 * Records needle parameters, energy/laser settings, serums, skin reactions,
 * and practitioner endorsement notes for the next aesthetician.
 */
export async function saveClinicalChart(data: {
  customer_id: string;
  treatment_name: string;
  session_number?: number;
  total_sessions_planned?: number;
  chart_date?: string;
  appointment_id?: string | null;
  package_id?: string | null;
  needle_parameters?: {
    depth_mm?: number | string | null;
    gauge?: string | null;
    technique?: string | null;
  };
  energy_parameters?: {
    machine_name?: string | null;
    intensity_level?: string | null;
    energy_joules?: number | string | null;
    pulse_duration_ms?: number | string | null;
    spot_size_mm?: number | string | null;
    pass_count?: number | null;
  };
  products_used?: {
    serum_brand?: string | null;
    peel_solution?: string | null;
    application_time_minutes?: number | null;
    topical_anesthetic_used?: boolean;
    calming_mask?: string | null;
  };
  skin_reaction?: {
    erythema?: "none" | "mild" | "moderate" | "intense";
    edema?: "none" | "mild" | "moderate";
    pinpoint_bleeding?: boolean;
    frosting?: boolean;
    pain_scale?: number;
    client_tolerance?: "excellent" | "good" | "sensitive" | "poor";
  };
  clinical_notes?: string;
  endorsement_notes?: string;
  homecare_advice?: string;
  next_recommended_date?: string;
}): Promise<{
  success: boolean;
  chart?: ClinicalChartRecord;
  error?: string;
}> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  if (!data.customer_id) {
    return { success: false, error: "Missing customer identifier." };
  }
  if (!data.treatment_name?.trim()) {
    return { success: false, error: "Treatment / procedure name is required." };
  }

  try {
    const { data: chart, error: insertErr } = await supabase
      .from("clinical_treatment_charts")
      .insert({
        customer_id: data.customer_id,
        treatment_name: data.treatment_name.trim(),
        session_number: data.session_number || 1,
        total_sessions_planned: data.total_sessions_planned || 6,
        chart_date: data.chart_date || new Date().toISOString().slice(0, 10),
        appointment_id: data.appointment_id || null,
        package_id: data.package_id || null,
        branch_id: staff.branchId || null,
        performed_by_id: staff.id,
        performed_by_name: staff.fullName,
        performed_by_role: staff.role === "nurse" ? "Registered Nurse" : staff.role === "doctor" ? "Attending Physician" : "Clinical Aesthetician",
        needle_parameters: data.needle_parameters || {},
        energy_parameters: data.energy_parameters || {},
        products_used: data.products_used || {},
        skin_reaction: data.skin_reaction || {},
        clinical_notes: data.clinical_notes || null,
        endorsement_notes: data.endorsement_notes || null,
        homecare_advice: data.homecare_advice || null,
        next_recommended_date: data.next_recommended_date || null,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Clinical chart insert error:", insertErr);
      return { success: false, error: `Failed to record treatment chart: ${insertErr.message}` };
    }

    // Log to audit trail
    await supabase.from("client_audit_logs").insert({
      action: "TREATMENT_CHARTED",
      customer_id: data.customer_id,
      actor_id: staff.id,
      export_type: "CHART_ENTRY",
      branch_id: staff.branchId || null,
      metadata: {
        chart_id: chart.id,
        treatment_name: data.treatment_name,
        session_number: data.session_number || 1,
        performed_by: staff.fullName,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true, chart: chart as ClinicalChartRecord };
  } catch (err: any) {
    console.error("Exception in saveClinicalChart:", err);
    return { success: false, error: err.message || "Failed to record clinical chart." };
  }
}

/**
 * 12. DELETE CLINICAL TREATMENT CHART
 */
export async function deleteClinicalChart(
  chartId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error: delErr } = await supabase
      .from("clinical_treatment_charts")
      .delete()
      .eq("id", chartId);

    if (delErr) return { success: false, error: delErr.message };

    await supabase.from("client_audit_logs").insert({
      action: "TREATMENT_CHART_DELETED",
      customer_id: customerId,
      actor_id: staff.id,
      export_type: "CHART_DELETE",
      branch_id: staff.branchId || null,
      metadata: {
        chart_id: chartId,
        actor: staff.fullName,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete clinical chart." };
  }
}
