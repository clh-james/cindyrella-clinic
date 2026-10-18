// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Pure Date & Interval Calculators for Recurring Schedules
// ==============================================================================

import type { RecurrenceFrequency } from "@/app/admin/(dashboard)/bills/types";

/**
 * Computes the next billing date given current date and frequency.
 */
export function calculateNextBillingDate(
  currentDateStr: string,
  frequency: RecurrenceFrequency,
  customIntervalDays: number = 30
): string {
  const [year, month, day] = currentDateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  switch (frequency) {
    case "weekly":
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case "monthly":
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case "quarterly":
      date.setUTCMonth(date.getUTCMonth() + 3);
      break;
    case "semi_annually":
      date.setUTCMonth(date.getUTCMonth() + 6);
      break;
    case "annually":
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
    case "custom":
      date.setUTCDate(date.getUTCDate() + Math.max(1, customIntervalDays));
      break;
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Calculates due date for a generated bill based on template rule.
 */
export function calculateDueDateForRule(params: {
  issueDateStr: string;
  rule: "day_of_month" | "days_after_billing";
  offset: number;
}): string {
  const [iY, iM, iD] = params.issueDateStr.split("-").map(Number);

  if (params.rule === "day_of_month") {
    // Due on a specific day of the same month, or next month if day is in past
    const targetDay = Math.min(28, Math.max(1, params.offset || 15));
    let dueYear = iY;
    let dueMonth = iM;
    if (targetDay < iD) {
      dueMonth += 1;
      if (dueMonth > 12) {
        dueMonth = 1;
        dueYear += 1;
      }
    }
    const d = new Date(Date.UTC(dueYear, dueMonth - 1, targetDay));
    return d.toISOString().slice(0, 10);
  } else {
    // Days after billing
    const offsetDays = Math.max(0, params.offset || 15);
    const d = new Date(Date.UTC(iY, iM - 1, iD + offsetDays));
    return d.toISOString().slice(0, 10);
  }
}
