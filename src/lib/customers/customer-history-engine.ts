// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Client History Calculation & Reconciliation Engine
// Timezone: Asia/Manila (UTC+8)
// ==============================================================================

import type {
  CustomerProfile,
  InstallmentApplication,
  InstallmentSchedule,
  InstallmentPayment,
  CustomerPackage,
  UnifiedPaymentRecord,
  ClientActivityTimelineItem,
  ClientFinancialSummary,
  ClientAppointmentItem,
  CompleteClientFile,
  InstallmentScheduleStatus,
} from "@/app/admin/(dashboard)/customers/types";

export const APP_TIMEZONE = "Asia/Manila";

/**
 * Decimal-safe rounding to 2 decimal places.
 */
export function roundCurrency(amount: number): number {
  return Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Format currency for Philippine Peso (₱).
 */
export function formatPHP(val?: number | null): string {
  return `₱${(val || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Returns the current date formatted as YYYY-MM-DD in Asia/Manila.
 */
export function getLocalDateString(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns difference in calendar days between targetDate and referenceDate (YYYY-MM-DD).
 * Positive if targetDate is in future, negative if in the past, 0 if today.
 */
export function getCalendarDayDiff(targetDateStr: string, referenceDateStr?: string): number {
  const refStr = referenceDateStr || getLocalDateString();
  const [tY, tM, tD] = targetDateStr.split("-").map(Number);
  const [rY, rM, rD] = refStr.split("-").map(Number);

  const tDate = Date.UTC(tY, tM - 1, tD);
  const rDate = Date.UTC(rY, rM - 1, rD);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((tDate - rDate) / msPerDay);
}

/**
 * Calculates Outstanding Balance = Total Contract Amount - Valid Payments.
 * Strictly non-negative and decimal-safe.
 */
export function calculateContractBalance(contractAmount: number, validPayments: number): number {
  const safeContract = roundCurrency(contractAmount);
  const safePayments = roundCurrency(validPayments);
  const balance = safeContract - safePayments;
  return roundCurrency(Math.max(0, balance));
}

/**
 * Evaluates the authoritative status of a single installment schedule item.
 */
export function determineScheduleStatus(
  dueDateStr: string,
  scheduledAmount: number,
  amountPaid: number,
  referenceDateStr?: string
): InstallmentScheduleStatus {
  const safeScheduled = roundCurrency(scheduledAmount);
  const safePaid = roundCurrency(amountPaid);

  if (safePaid >= safeScheduled) {
    return "paid";
  }

  const dayDiff = getCalendarDayDiff(dueDateStr, referenceDateStr);

  if (safePaid > 0) {
    return dayDiff < 0 ? "overdue" : "partially_paid";
  }

  if (dayDiff < 0) {
    return "overdue";
  } else if (dayDiff === 0) {
    return "due_today";
  } else {
    return "upcoming";
  }
}

/**
 * Builds unified and deduplicated payment records across installments, POS sales, and appointments.
 * Prevents double-counting when an installment payment is also linked to a POS sale or appointment.
 */
export function buildUnifiedPaymentHistory(params: {
  installmentPayments: InstallmentPayment[];
  posSales: Array<{
    id: string;
    reference_number: string;
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    branch_name?: string | null;
    shift_id?: string | null;
  }>;
  appointments: Array<{
    id: string;
    reference_number: string;
    amount_due: number;
    payment_method: string;
    payment_status: string;
    created_at: string;
    branch_name?: string | null;
  }>;
}): UnifiedPaymentRecord[] {
  const unified: UnifiedPaymentRecord[] = [];
  const knownTxnRefs = new Set<string>();

  // 1. Installment Payments (Authoritative source for contract payments)
  for (const ip of params.installmentPayments) {
    const isReversedOrRefunded = ip.status === "reversed" || ip.status === "refunded" || ip.status === "voided";
    const refKey = (ip.transaction_reference || ip.reference_number || "").trim().toLowerCase();
    if (refKey) {
      knownTxnRefs.add(refKey);
    }
    if (ip.payment_number) {
      knownTxnRefs.add(ip.payment_number.trim().toLowerCase());
    }

    unified.push({
      id: `inst_${ip.id}`,
      source: "installment",
      payment_date: ip.payment_date,
      payment_reference: ip.payment_number,
      transaction_reference: ip.transaction_reference || null,
      application_reference: ip.application_number || null,
      installment_number: ip.installment_number || null,
      amount_paid: roundCurrency(Number(ip.amount_paid)),
      payment_method: ip.payment_method || "cash",
      branch_name: ip.branch_name || "Main Clinic",
      received_by_name: ip.received_by_name || null,
      shift_reference: ip.shift_id || null,
      receipt_number: ip.receipt_number || null,
      status: ip.status,
      is_valid_collection: !isReversedOrRefunded && ip.status === "completed",
      notes: ip.notes || (ip.reversal_reason ? `Reversal: ${ip.reversal_reason}` : null),
    });
  }

  // 2. POS Retail Sales (avoid double counting if reference already tracked)
  for (const pos of params.posSales) {
    const refKey = (pos.reference_number || "").trim().toLowerCase();
    if (refKey && knownTxnRefs.has(refKey)) {
      // Duplicate payment already accounted for under installments
      continue;
    }

    const isVoidedOrRefunded = pos.status === "voided" || pos.status === "refunded";

    unified.push({
      id: `pos_${pos.id}`,
      source: "pos_sale",
      payment_date: pos.created_at,
      payment_reference: pos.reference_number || "POS-SALE",
      transaction_reference: pos.reference_number || null,
      application_reference: null,
      installment_number: null,
      amount_paid: roundCurrency(Number(pos.total_amount)),
      payment_method: pos.payment_method || "cash",
      branch_name: pos.branch_name || "Main Clinic",
      received_by_name: null,
      shift_reference: pos.shift_id || null,
      receipt_number: pos.reference_number || null,
      status: isVoidedOrRefunded ? (pos.status as any) : "completed",
      is_valid_collection: !isVoidedOrRefunded && pos.status === "completed",
      notes: "POS Retail Merchandise Sale",
    });
  }

  // 3. Paid Appointments (treatments)
  for (const appt of params.appointments) {
    const refKey = (appt.reference_number || "").trim().toLowerCase();
    if (refKey && knownTxnRefs.has(refKey)) {
      // Already accounted for
      continue;
    }

    const isPaid = appt.payment_status === "paid";
    const isReversed = appt.payment_status === "voided" || appt.payment_status === "refunded";

    unified.push({
      id: `appt_${appt.id}`,
      source: "appointment",
      payment_date: appt.created_at,
      payment_reference: appt.reference_number || "APPT-PAY",
      transaction_reference: appt.reference_number || null,
      application_reference: null,
      installment_number: null,
      amount_paid: roundCurrency(Number(appt.amount_due)),
      payment_method: appt.payment_method || "cash",
      branch_name: appt.branch_name || "Main Clinic",
      received_by_name: null,
      shift_reference: null,
      receipt_number: appt.reference_number || null,
      status: isPaid ? "completed" : isReversed ? (appt.payment_status as any) : "pending",
      is_valid_collection: isPaid,
      notes: "Clinic Treatment Booking Payment",
    });
  }

  // Sort descending by payment date
  return unified.sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );
}

/**
 * Computes consolidated financial KPI metrics for a client.
 */
export function computeClientFinancialSummary(
  applications: InstallmentApplication[],
  unifiedPayments: UnifiedPaymentRecord[],
  referenceDateStr?: string
): ClientFinancialSummary {
  const todayStr = referenceDateStr || getLocalDateString();

  let totalContractValue = 0;
  let totalValidPayments = 0;
  let totalRefundedReversed = 0;
  let overdueBalance = 0;
  let nextDueDate: string | null = null;
  let nextScheduledAmount: number | null = null;
  let paidInstallmentsCount = 0;
  let remainingInstallmentsCount = 0;
  let activeApplicationsCount = 0;

  // 1. Accumulate Contract Values & Application specific schedules
  for (const app of applications) {
    if (app.status !== "cancelled" && app.status !== "rejected") {
      totalContractValue = roundCurrency(totalContractValue + Number(app.original_contract_amount));
      if (app.status === "active") {
        activeApplicationsCount++;
      }
    }

    if (app.schedules) {
      for (const s of app.schedules) {
        const schedAmount = roundCurrency(Number(s.scheduled_amount));
        const paidAmount = roundCurrency(Number(s.amount_paid));
        const remAmount = roundCurrency(Math.max(0, schedAmount - paidAmount));

        if (paidAmount >= schedAmount && schedAmount > 0) {
          paidInstallmentsCount++;
        } else if (remAmount > 0) {
          remainingInstallmentsCount++;

          const dayDiff = getCalendarDayDiff(s.due_date, todayStr);
          if (dayDiff < 0) {
            overdueBalance = roundCurrency(overdueBalance + remAmount);
          } else if (dayDiff >= 0) {
            // Upcoming or due today
            if (!nextDueDate || s.due_date < nextDueDate) {
              nextDueDate = s.due_date;
              nextScheduledAmount = remAmount;
            }
          }
        }
      }
    }
  }

  // 2. Accumulate Valid and Refunded/Reversed Collections from unified payments
  for (const p of unifiedPayments) {
    if (p.is_valid_collection) {
      totalValidPayments = roundCurrency(totalValidPayments + p.amount_paid);
    } else if (p.status === "reversed" || p.status === "refunded" || p.status === "voided") {
      totalRefundedReversed = roundCurrency(totalRefundedReversed + p.amount_paid);
    }
  }

  // 3. Outstanding balance is strictly Contract Value minus Valid Payments
  const totalOutstandingBalance = calculateContractBalance(totalContractValue, totalValidPayments);

  return {
    total_contract_value: totalContractValue,
    total_valid_payments: totalValidPayments,
    total_refunded_reversed: totalRefundedReversed,
    total_outstanding_balance: totalOutstandingBalance,
    overdue_balance: overdueBalance,
    next_due_date: nextDueDate,
    next_scheduled_amount: nextScheduledAmount,
    paid_installments_count: paidInstallmentsCount,
    remaining_installments_count: remainingInstallmentsCount,
    active_applications_count: activeApplicationsCount,
  };
}

/**
 * Builds a chronological audit-ready activity timeline.
 */
export function buildClientActivityTimeline(params: {
  client: CustomerProfile;
  applications: InstallmentApplication[];
  payments: UnifiedPaymentRecord[];
  appointments: ClientAppointmentItem[];
  packages: CustomerPackage[];
}): ClientActivityTimelineItem[] {
  const timeline: ClientActivityTimelineItem[] = [];

  // 1. Client Registration
  if (params.client.created_at) {
    timeline.push({
      id: `reg_${params.client.id}`,
      timestamp: params.client.created_at,
      date_formatted: new Date(params.client.created_at).toLocaleString("en-PH"),
      type: "client_registration",
      title: "Client Registered",
      description: `Account created for ${params.client.first_name} ${params.client.last_name}`,
      reference_number: params.client.customer_code || params.client.id.slice(0, 8),
      branch_name: params.client.branch_name || "Main Clinic",
      status: "active",
      amount: null,
      actor_name: "Registration Desk",
    });
  }

  // 2. Installment Applications
  for (const app of params.applications) {
    timeline.push({
      id: `app_${app.id}`,
      timestamp: app.created_at,
      date_formatted: new Date(app.created_at).toLocaleString("en-PH"),
      type: "installment_application_submitted",
      title: "Installment Contract Submitted",
      description: `${app.service_package_name} (${app.number_of_installments}x ${app.frequency} payments of ${formatPHP(app.installment_amount)})`,
      reference_number: app.application_number,
      branch_name: app.branch_name || "Main Clinic",
      status: app.status,
      amount: app.original_contract_amount,
      actor_name: app.approved_by_name || "Branch Officer",
    });

    if (app.approval_status === "approved" && app.approved_at) {
      timeline.push({
        id: `app_appr_${app.id}`,
        timestamp: app.approved_at,
        date_formatted: new Date(app.approved_at).toLocaleString("en-PH"),
        type: "installment_application_approved",
        title: "Installment Application Approved",
        description: `Contract ${app.application_number} authorized and activated.`,
        reference_number: app.application_number,
        branch_name: app.branch_name || "Main Clinic",
        status: "approved",
        amount: app.original_contract_amount,
        actor_name: app.approved_by_name || "Branch Manager",
      });
    }

    if (app.down_payment_received > 0) {
      timeline.push({
        id: `dp_${app.id}`,
        timestamp: app.contract_start_date || app.created_at,
        date_formatted: new Date(app.contract_start_date || app.created_at).toLocaleDateString("en-PH"),
        type: "down_payment_received",
        title: "Contract Down Payment Received",
        description: `Down payment for contract ${app.application_number}`,
        reference_number: app.application_number,
        branch_name: app.branch_name || "Main Clinic",
        status: "completed",
        amount: app.down_payment_received,
        actor_name: "Cashier",
      });
    }
  }

  // 3. Payments (Installments, POS, Appointments)
  for (const pay of params.payments) {
    const isReversal = pay.status === "reversed" || pay.status === "voided";
    const isRefund = pay.status === "refunded";

    timeline.push({
      id: `pay_${pay.id}`,
      timestamp: pay.payment_date,
      date_formatted: new Date(pay.payment_date).toLocaleString("en-PH"),
      type: isReversal
        ? "payment_reversed"
        : isRefund
        ? "payment_refunded"
        : pay.source === "installment"
        ? "installment_payment_received"
        : "pos_sale",
      title: isReversal
        ? "Payment Reversed / Voided"
        : isRefund
        ? "Payment Refunded"
        : pay.source === "installment"
        ? `Installment Payment (${pay.installment_number ? `#${pay.installment_number}` : "Contract"})`
        : pay.source === "pos_sale"
        ? "POS Retail Purchase"
        : "Treatment Booking Payment",
      description: `${pay.payment_method.toUpperCase()} — Ref: ${pay.payment_reference}${pay.receipt_number ? ` (OR# ${pay.receipt_number})` : ""}${pay.notes ? ` — ${pay.notes}` : ""}`,
      reference_number: pay.payment_reference,
      branch_name: pay.branch_name,
      status: pay.status,
      amount: pay.amount_paid,
      actor_name: pay.received_by_name || "Cashier",
    });
  }

  // 4. Appointments & Treatments
  for (const appt of params.appointments) {
    timeline.push({
      id: `appt_${appt.id}`,
      timestamp: `${appt.appointment_date}T${appt.appointment_time || "09:00:00"}`,
      date_formatted: `${appt.appointment_date} ${appt.appointment_time}`,
      type: appt.status === "completed" ? "appointment_completed" : "service_rendered",
      title: `Treatment: ${appt.treatment_name}`,
      description: `Appointment ${appt.reference_number} at ${appt.branch_name} (${appt.status})`,
      reference_number: appt.reference_number,
      branch_name: appt.branch_name,
      status: appt.status,
      amount: appt.amount_due,
      actor_name: "Clinical Staff",
    });
  }

  // 5. Packages & Memberships
  for (const pkg of params.packages) {
    timeline.push({
      id: `pkg_${pkg.id}`,
      timestamp: pkg.created_at,
      date_formatted: new Date(pkg.created_at).toLocaleString("en-PH"),
      type: "package_purchased",
      title: `Treatment Package: ${pkg.package_name}`,
      description: `${pkg.total_sessions} Sessions total (${pkg.sessions_remaining} remaining) — Status: ${pkg.status}`,
      reference_number: pkg.id.slice(0, 8),
      branch_name: pkg.branch_name || "Main Clinic",
      status: pkg.status,
      amount: pkg.price_paid,
      actor_name: "Front Desk",
    });
  }

  // Sort chronologically descending (newest first)
  return timeline.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Assembles the full consolidated client file record.
 */
export function buildCompleteClientFile(params: {
  client: CustomerProfile;
  applications: InstallmentApplication[];
  payments: UnifiedPaymentRecord[];
  appointments: ClientAppointmentItem[];
  packages: CustomerPackage[];
  actorName: string;
  branchScope: string;
}): CompleteClientFile {
  const summary = computeClientFinancialSummary(params.applications, params.payments);
  const timeline = buildClientActivityTimeline({
    client: params.client,
    applications: params.applications,
    payments: params.payments,
    appointments: params.appointments,
    packages: params.packages,
  });

  const allSchedules: InstallmentSchedule[] = [];
  for (const app of params.applications) {
    if (app.schedules) {
      allSchedules.push(...app.schedules);
    }
  }

  return {
    client: params.client,
    summary,
    applications: params.applications,
    schedules: allSchedules,
    payments: params.payments,
    appointments: params.appointments,
    packages: params.packages,
    timeline,
    generated_at: new Date().toISOString(),
    generated_by: params.actorName,
    branch_scope: params.branchScope,
  };
}
