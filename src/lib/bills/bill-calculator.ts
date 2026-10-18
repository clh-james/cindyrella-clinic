// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Decimal-Safe Financial Calculations & Time-Based Bill Status Engine
// Configured Timezone: Asia/Manila (UTC+8)
// ==============================================================================

import type { BillItem, BillStatus, ReminderStage, BillSummaryKPIs } from "@/app/admin/(dashboard)/bills/types";

export const APP_TIMEZONE = "Asia/Manila";

/**
 * Returns the current date formatted as YYYY-MM-DD in the clinic's local timezone.
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
    // Fallback if environment doesn't recognize timezone string
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Calculates calendar day difference between targetDate and referenceDate (target - reference).
 * Positive if targetDate is in the future, negative if in the past.
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
 * Decimal-safe rounding to 2 decimal places.
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Format currency for display (₱).
 */
export function formatPHP(val?: number | null): string {
  return `₱${(val || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Computes total valid (non-reversed) payments for a bill.
 */
export function computeValidPaymentsTotal(
  payments?: Array<{ amount?: number | null; is_reversed?: boolean | null }> | null
): number {
  if (!payments || payments.length === 0) return 0;
  const sum = payments
    .filter((p) => !p.is_reversed)
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  return roundCurrency(sum);
}

/**
 * Calculates Outstanding Balance = Total Bill Amount - Valid Payments.
 * Decimal safe, strictly non-negative.
 */
export function calculateOutstandingBalance(totalAmount: number, totalPaid: number): number {
  const safeTotal = roundCurrency(Number(totalAmount || 0));
  const safePaid = roundCurrency(Number(totalPaid || 0));
  const balance = safeTotal - safePaid;
  return roundCurrency(Math.max(0, balance));
}

/**
 * Derives the explicit, authoritative bill status.
 * Evaluates: Due Date, Total Amount, Valid Payments, Cancellation state.
 *
 * Rules:
 * 1. Cancelled -> "cancelled"
 * 2. Draft -> "draft"
 * 3. Outstanding balance <= 0 -> "paid" (A fully paid bill CANNOT remain overdue)
 * 4. Balance > 0 and payments > 0:
 *    - If due date < today -> "overdue"
 *    - Else -> "partially_paid"
 * 5. Balance > 0 and payments == 0:
 *    - If due date < today -> "overdue"
 *    - If due date == today -> "due_today"
 *    - If due date > today -> "upcoming"
 */
export function deriveBillStatus(params: {
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  isCancelled?: boolean;
  cancelledAt?: string | null;
  isDraft?: boolean;
  referenceDateStr?: string;
}): BillStatus {
  if (params.isCancelled || params.cancelledAt) {
    return "cancelled";
  }

  if (params.isDraft) {
    return "draft";
  }

  const balance = calculateOutstandingBalance(params.totalAmount, params.amountPaid);

  if (balance <= 0 && params.totalAmount > 0) {
    return "paid";
  }

  const dayDiff = getCalendarDayDiff(params.dueDate, params.referenceDateStr);

  if (dayDiff < 0) {
    // Due date has passed and balance remains
    return "overdue";
  }

  if (params.amountPaid > 0 && balance > 0) {
    return "partially_paid";
  }

  if (dayDiff === 0) {
    return "due_today";
  }

  return "upcoming";
}

/**
 * Determines whether a bill should receive a reminder for a given stage on a given date.
 */
export function isBillEligibleForReminderStage(params: {
  bill: {
    status: BillStatus;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    reminder_schedule?: { stages: ReminderStage[] } | null;
    cancelled_at?: string | null;
  };
  stage: ReminderStage;
  referenceDateStr?: string;
}): boolean {
  const { bill, stage } = params;

  // Ineligible statuses: cancelled, paid, draft
  if (bill.cancelled_at || bill.status === "cancelled" || bill.status === "paid" || bill.status === "draft") {
    return false;
  }

  // Balance must be greater than zero
  const balance = calculateOutstandingBalance(bill.total_amount, bill.amount_paid);
  if (balance <= 0) {
    return false;
  }

  // Check if bill has this stage enabled in its schedule
  const stages = bill.reminder_schedule?.stages || ["7_days", "3_days", "1_day", "due_date", "overdue"];
  if (!stages.includes(stage)) {
    return false;
  }

  const diff = getCalendarDayDiff(bill.due_date, params.referenceDateStr);

  switch (stage) {
    case "7_days":
      return diff === 7;
    case "3_days":
      return diff === 3;
    case "1_day":
      return diff === 1;
    case "due_date":
      return diff === 0;
    case "overdue":
      return diff < 0; // Overdue reminder
    default:
      return false;
  }
}

/**
 * Calculates Next Reminder Date and Stage for display in the table.
 */
export function getNextReminderInfo(params: {
  dueDate: string;
  status: BillStatus;
  amountPaid: number;
  totalAmount: number;
  stagesConfig?: ReminderStage[];
  alreadySentKeys?: Set<string>;
  referenceDateStr?: string;
}): { nextDate: string | null; nextStage: ReminderStage | string | null } {
  const { dueDate, status, amountPaid, totalAmount, alreadySentKeys } = params;

  if (status === "paid" || status === "cancelled" || status === "draft") {
    return { nextDate: null, nextStage: null };
  }

  const balance = calculateOutstandingBalance(totalAmount, amountPaid);
  if (balance <= 0) {
    return { nextDate: null, nextStage: null };
  }

  const todayStr = params.referenceDateStr || getLocalDateString();
  const diff = getCalendarDayDiff(dueDate, todayStr);

  const stages: ReminderStage[] = params.stagesConfig || ["7_days", "3_days", "1_day", "due_date", "overdue"];

  // If already overdue
  if (diff < 0) {
    if (stages.includes("overdue")) {
      return { nextDate: todayStr, nextStage: "overdue" };
    }
    return { nextDate: null, nextStage: null };
  }

  // If due today
  if (diff === 0) {
    if (stages.includes("due_date")) {
      return { nextDate: dueDate, nextStage: "due_date" };
    }
  }

  // Check upcoming stages in order
  const stageOffsets: Record<ReminderStage, number> = {
    "7_days": 7,
    "3_days": 3,
    "1_day": 1,
    due_date: 0,
    overdue: -1,
  };

  const [dY, dM, dD] = dueDate.split("-").map(Number);

  for (const st of ["7_days", "3_days", "1_day", "due_date"] as ReminderStage[]) {
    if (!stages.includes(st)) continue;
    const offset = stageOffsets[st];
    if (diff >= offset) {
      // Calculate target date = due_date - offset days
      const targetDate = new Date(Date.UTC(dY, dM - 1, dD - offset));
      const targetDateStr = targetDate.toISOString().slice(0, 10);
      const key = `${st}_${targetDateStr}`;
      if (!alreadySentKeys || !alreadySentKeys.has(key)) {
        return { nextDate: targetDateStr, nextStage: st };
      }
    }
  }

  if (stages.includes("overdue")) {
    const overdueTarget = new Date(Date.UTC(dY, dM - 1, dD + 1));
    return { nextDate: overdueTarget.toISOString().slice(0, 10), nextStage: "overdue" };
  }

  return { nextDate: null, nextStage: null };
}

/**
 * Computes Dashboard Summary KPI Cards from active bill items.
 *
 * Cards:
 * 1. Due Today (amount and count)
 * 2. Due Within 7 Days (amount and count)
 * 3. Overdue Bills (amount and count)
 * 4. Outstanding Bills (amount and count)
 * 5. Paid This Month (amount and count)
 *
 * Rules:
 * - Paid bills are NOT included in outstanding totals!
 * - Cancelled bills are ignored in pending/due totals.
 */
export function computeBillSummaryKPIs(
  bills: BillItem[],
  referenceDateStr?: string
): BillSummaryKPIs {
  const todayStr = referenceDateStr || getLocalDateString();
  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

  let dueTodayCount = 0;
  let dueTodayAmount = 0;

  let dueWithin7DaysCount = 0;
  let dueWithin7DaysAmount = 0;

  let overdueCount = 0;
  let overdueAmount = 0;

  let outstandingCount = 0;
  let outstandingAmount = 0;

  let paidThisMonthCount = 0;
  let paidThisMonthAmount = 0;

  for (const b of bills) {
    const balance = calculateOutstandingBalance(b.total_amount, b.amount_paid);
    const dayDiff = getCalendarDayDiff(b.due_date, todayStr);

    // Paid this month check (either bill paid in full or payments made this month)
    const paidInMonthPayments = (b.payments || [])
      .filter((p) => !p.is_reversed && p.payment_date.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    if (paidInMonthPayments > 0) {
      paidThisMonthAmount += paidInMonthPayments;
      paidThisMonthCount += 1;
    } else if (b.status === "paid" && b.updated_at?.startsWith(currentMonthPrefix)) {
      paidThisMonthAmount += Number(b.amount_paid || b.total_amount);
      paidThisMonthCount += 1;
    }

    // Skip cancelled or fully paid bills from outstanding/due counts
    if (b.status === "cancelled" || b.status === "paid" || balance <= 0) {
      continue;
    }

    // Outstanding totals
    outstandingCount += 1;
    outstandingAmount += balance;

    // Overdue
    if (dayDiff < 0) {
      overdueCount += 1;
      overdueAmount += balance;
    }

    // Due Today
    if (dayDiff === 0) {
      dueTodayCount += 1;
      dueTodayAmount += balance;
    }

    // Due Within 7 Days (including today up to 7 days ahead)
    if (dayDiff >= 0 && dayDiff <= 7) {
      dueWithin7DaysCount += 1;
      dueWithin7DaysAmount += balance;
    }
  }

  return {
    dueTodayCount,
    dueTodayAmount: roundCurrency(dueTodayAmount),
    dueWithin7DaysCount,
    dueWithin7DaysAmount: roundCurrency(dueWithin7DaysAmount),
    overdueCount,
    overdueAmount: roundCurrency(overdueAmount),
    outstandingCount,
    outstandingAmount: roundCurrency(outstandingAmount),
    paidThisMonthCount,
    paidThisMonthAmount: roundCurrency(paidThisMonthAmount),
  };
}
