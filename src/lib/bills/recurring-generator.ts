// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Idempotent Recurring Bill Generation Engine
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { RecurrenceFrequency } from "@/app/admin/(dashboard)/bills/types";
import { getLocalDateString, roundCurrency } from "./bill-calculator";

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

/**
 * Generates an alphanumeric reference for a bill.
 */
function generateBillNumber(dateStr: string): string {
  const yearMonth = dateStr.slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BILL-${yearMonth}-${rand}`;
}

/**
 * Processes active recurring bill templates to generate future bill records safely.
 * Guaranteed idempotent: will not create duplicate bills for the same template in the same cycle.
 */
export async function generateRecurringBills(options?: {
  referenceDateStr?: string;
  targetTemplateId?: string;
}) {
  const supabase = createAdminClient();
  const todayStr = options?.referenceDateStr || getLocalDateString();

  const results = {
    generatedCount: 0,
    skippedCount: 0,
    errors: [] as string[],
    createdBills: [] as Array<{ templateId: string; billNumber: string; title: string }>,
  };

  try {
    let query = supabase
      .from("recurring_bill_templates")
      .select("*")
      .eq("status", "active")
      .eq("auto_generate", true)
      .lte("next_billing_date", todayStr);

    if (options?.targetTemplateId) {
      query = query.eq("id", options.targetTemplateId);
    }

    const { data: templates, error: tErr } = await query;

    if (tErr) {
      console.error("[recurring-generator:error]", tErr);
      results.errors.push(tErr.message);
      return results;
    }

    if (!templates || templates.length === 0) {
      return results;
    }

    for (const t of templates) {
      // Check if end_date has passed
      if (t.end_date && t.end_date < todayStr) {
        // Mark template as completed
        await supabase
          .from("recurring_bill_templates")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", t.id);
        results.skippedCount += 1;
        continue;
      }

      const issueDate = t.next_billing_date;
      const billingPeriod = `${issueDate.slice(0, 7)} (Cycle)`;

      // Idempotency check: has a bill for this template and billing period already been generated?
      const { data: existingBill } = await supabase
        .from("bills")
        .select("id, bill_number")
        .eq("recurring_rule_id", t.id)
        .eq("billing_period", billingPeriod)
        .maybeSingle();

      if (existingBill) {
        // Advance next billing date so it does not loop
        const nextBilling = calculateNextBillingDate(
          t.next_billing_date,
          t.frequency,
          t.custom_interval_days || 30
        );
        await supabase
          .from("recurring_bill_templates")
          .update({
            next_billing_date: nextBilling,
            updated_at: new Date().toISOString(),
          })
          .eq("id", t.id);

        results.skippedCount += 1;
        continue;
      }

      // Compute due date
      const dueDate = calculateDueDateForRule({
        issueDateStr: issueDate,
        rule: t.due_date_rule || "day_of_month",
        offset: t.due_day_offset || 15,
      });

      const billNumber = generateBillNumber(issueDate);
      const defaultAmt = roundCurrency(Number(t.default_amount || 0));
      const taxAmt = roundCurrency(Number(t.tax_amount || 0));
      const totalAmt = roundCurrency(defaultAmt + taxAmt);

      // Create new bill
      const { data: newBill, error: bErr } = await supabase
        .from("bills")
        .insert({
          bill_number: billNumber,
          title: t.template_name,
          category_id: t.category_id,
          vendor_or_payee: t.vendor_or_payee,
          branch_id: t.branch_id,
          invoice_number: null, // Pending actual invoice from vendor
          billing_period: billingPeriod,
          issue_date: issueDate,
          due_date: dueDate,
          amount_before_tax: defaultAmt,
          tax_amount: taxAmt,
          total_amount: totalAmt,
          amount_paid: 0.0,
          outstanding_balance: totalAmt,
          payment_method: t.payment_method || "bank_transfer",
          status: "upcoming",
          approval_status: "approved",
          is_recurring: true,
          recurring_rule_id: t.id,
          responsible_employee_id: t.responsible_employee_id,
          reminder_schedule: t.reminder_schedule || {
            stages: ["7_days", "3_days", "1_day", "due_date", "overdue"],
          },
          notes: t.notes ? `[Recurring Bill] ${t.notes}` : `[Recurring Schedule: ${t.frequency}]`,
        })
        .select()
        .single();

      if (bErr) {
        console.error("[recurring-generator:insertBillErr]", bErr);
        results.errors.push(`Template ${t.template_name}: ${bErr.message}`);
        continue;
      }

      // Record audit log
      await supabase.from("bill_audit_logs").insert({
        bill_id: newBill.id,
        actor_id: null,
        action: "BILL_CREATED",
        notes: `Generated automatically from recurring template "${t.template_name}" (${t.frequency}) for ${formatCurrency(totalAmt)}`,
        details: {
          recurring_rule_id: t.id,
          template_name: t.template_name,
          billing_period: billingPeriod,
        },
      });

      // Advance next billing date on template
      const nextBilling = calculateNextBillingDate(
        t.next_billing_date,
        t.frequency,
        t.custom_interval_days || 30
      );

      await supabase
        .from("recurring_bill_templates")
        .update({
          next_billing_date: nextBilling,
          last_generated_at: new Date().toISOString(),
          last_generated_bill_id: newBill.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", t.id);

      results.generatedCount += 1;
      results.createdBills.push({
        templateId: t.id,
        billNumber: newBill.bill_number,
        title: newBill.title,
      });
    }

    return results;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[recurring-generator:fatalError]", err);
    results.errors.push(errorMsg);
    return results;
  }
}

function formatCurrency(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
