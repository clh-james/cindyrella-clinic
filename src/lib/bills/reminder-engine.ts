// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Production Automated Payment Reminder Engine with Idempotency & Multi-Channel Delivery
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import {
  APP_TIMEZONE,
  getLocalDateString,
  getCalendarDayDiff,
  calculateOutstandingBalance,
  formatPHP,
} from "./bill-calculator";
import { ReminderStage } from "@/app/admin/(dashboard)/bills/types";

export interface ReminderProcessResult {
  success: boolean;
  timestamp: string;
  processedBillsCount: number;
  remindersCreated: number;
  remindersSkipped: number;
  remindersFailed: number;
  details: Array<{
    billId: string;
    billNumber: string;
    stage: ReminderStage | string;
    channel: "in_app" | "email" | "sms";
    status: "sent" | "skipped" | "failed";
    recipient?: string;
    error?: string;
    reason?: string;
  }>;
}

/**
 * Builds the subject and human-readable text for a bill reminder.
 */
function getReminderCopy(params: {
  stage: ReminderStage | string;
  billTitle: string;
  vendor: string;
  branchName: string;
  dueDate: string;
  outstandingBalance: number;
  diffDays: number;
}) {
  const { stage, billTitle, vendor, branchName, dueDate, outstandingBalance, diffDays } = params;
  const balanceFmt = formatPHP(outstandingBalance);

  let stageLabel = "PAYMENT REMINDER";
  let urgencyText = `Due on ${dueDate}`;

  if (stage === "7_days" || diffDays === 7) {
    stageLabel = "BILL DUE IN 7 DAYS";
    urgencyText = `Due in 7 days (${dueDate})`;
  } else if (stage === "3_days" || diffDays === 3) {
    stageLabel = "BILL DUE IN 3 DAYS";
    urgencyText = `Due in 3 days (${dueDate})`;
  } else if (stage === "1_day" || diffDays === 1) {
    stageLabel = "BILL DUE TOMORROW";
    urgencyText = `Due tomorrow (${dueDate})! Action recommended today.`;
  } else if (stage === "due_date" || diffDays === 0) {
    stageLabel = "BILL DUE TODAY";
    urgencyText = `Due today (${dueDate}). Please disburse or record payment.`;
  } else if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    stageLabel = `OVERDUE BILL (${overdueDays} ${overdueDays === 1 ? "DAY" : "DAYS"} OVERDUE)`;
    urgencyText = `Past due by ${overdueDays} ${overdueDays === 1 ? "day" : "days"} (Due ${dueDate})! Immediate attention required.`;
  }

  const title = `[${stageLabel}] ${billTitle} — ${balanceFmt}`;
  const message = `${billTitle} for ${vendor} (${branchName}) has an outstanding balance of ${balanceFmt}. ${urgencyText}`;

  return { title, message, stageLabel, urgencyText };
}

/**
 * Executes the automated reminder cycle for all eligible bills across branches.
 * Idempotent: uses unique keys to guarantee no duplicate reminders on the same day for the same stage.
 */
export async function runReminderAutomation(options?: {
  referenceDateStr?: string;
  targetBillId?: string;
  forceInAppOnly?: boolean;
}): Promise<ReminderProcessResult> {
  const supabase = createAdminClient();
  const todayStr = options?.referenceDateStr || getLocalDateString(new Date(), APP_TIMEZONE);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cindyrella-admin.com";

  const result: ReminderProcessResult = {
    success: true,
    timestamp: new Date().toISOString(),
    processedBillsCount: 0,
    remindersCreated: 0,
    remindersSkipped: 0,
    remindersFailed: 0,
    details: [],
  };

  try {
    // 1. Fetch eligible bills (exclude paid, cancelled, draft)
    let billQuery = supabase
      .from("bills")
      .select(`
        id,
        bill_number,
        title,
        vendor_or_payee,
        branch_id,
        due_date,
        total_amount,
        amount_paid,
        outstanding_balance,
        status,
        approval_status,
        reminder_schedule,
        responsible_employee_id,
        cancelled_at,
        branch:branches(id, name),
        responsible_employee:staff!bills_responsible_employee_id_fkey(id, full_name, email, phone)
      `)
      .not("status", "in", '("paid","cancelled","draft")')
      .is("cancelled_at", null);

    if (options?.targetBillId) {
      billQuery = billQuery.eq("id", options.targetBillId);
    }

    const { data: eligibleBills, error: fetchError } = await billQuery;

    if (fetchError) {
      console.error("[reminder-engine:fetchError]", fetchError);
      return {
        ...result,
        success: false,
        details: [
          {
            billId: "none",
            billNumber: "N/A",
            stage: "all",
            channel: "in_app",
            status: "failed",
            error: fetchError.message,
          },
        ],
      };
    }

    if (!eligibleBills || eligibleBills.length === 0) {
      return result;
    }

    result.processedBillsCount = eligibleBills.length;

    // 2. Fetch Super Admins & Branch Managers to receive escalation notices
    const { data: adminStaff } = await supabase
      .from("staff")
      .select("id, full_name, email, phone, branch_id, roles(name)")
      .eq("is_active", true);

    // 3. Process each eligible bill
    for (const b of eligibleBills) {
      // Re-verify current live balance immediately before dispatching
      const liveBalance = calculateOutstandingBalance(Number(b.total_amount), Number(b.amount_paid));

      if (liveBalance <= 0) {
        result.remindersSkipped += 1;
        result.details.push({
          billId: b.id,
          billNumber: b.bill_number,
          stage: "skip_balance_zero",
          channel: "in_app",
          status: "skipped",
          reason: "Bill has already been paid in full.",
        });
        continue;
      }

      const diffDays = getCalendarDayDiff(b.due_date, todayStr);
      const configuredStages: ReminderStage[] = b.reminder_schedule?.stages || [
        "7_days",
        "3_days",
        "1_day",
        "due_date",
        "overdue",
      ];

      // Determine matching stage for today
      let matchedStage: ReminderStage | null = null;
      if (diffDays === 7 && configuredStages.includes("7_days")) matchedStage = "7_days";
      else if (diffDays === 3 && configuredStages.includes("3_days")) matchedStage = "3_days";
      else if (diffDays === 1 && configuredStages.includes("1_day")) matchedStage = "1_day";
      else if (diffDays === 0 && configuredStages.includes("due_date")) matchedStage = "due_date";
      else if (diffDays < 0 && configuredStages.includes("overdue")) matchedStage = "overdue";

      if (!matchedStage) {
        // Not a scheduled reminder trigger day for this bill
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const branchObj = Array.isArray(b.branch) ? b.branch[0] : (b.branch as any);
      const branchName = branchObj?.name || "Main Clinic";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const respEmp = Array.isArray(b.responsible_employee) ? b.responsible_employee[0] : (b.responsible_employee as any);

      // Identify recipients:
      // 1. Responsible employee (if assigned)
      // 2. Managers of the bill's branch
      // 3. Super admins (for overdue or due-today bills)
      const recipientIds = new Set<string>();
      if (respEmp?.id) recipientIds.add(respEmp.id);

      for (const st of adminStaff || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roleName = (Array.isArray(st.roles) ? st.roles[0]?.name : (st.roles as any)?.name) || "";
        if (roleName === "super_admin" && (matchedStage === "due_date" || matchedStage === "overdue")) {
          recipientIds.add(st.id);
        } else if (roleName === "manager" && st.branch_id === b.branch_id) {
          recipientIds.add(st.id);
        }
      }

      if (recipientIds.size === 0 && adminStaff && adminStaff.length > 0) {
        // Fallback to first active admin
        recipientIds.add(adminStaff[0].id);
      }

      const { title, message, stageLabel } = getReminderCopy({
        stage: matchedStage,
        billTitle: b.title,
        vendor: b.vendor_or_payee,
        branchName,
        dueDate: b.due_date,
        outstandingBalance: liveBalance,
        diffDays,
      });

      const billUrl = `${siteUrl}/admin/bills?id=${b.id}`;

      // Dispatch for each recipient
      for (const rId of recipientIds) {
        const staffRecord = (adminStaff || []).find((s) => s.id === rId) || respEmp;
        const recipientName = staffRecord?.full_name || "Responsible Officer";
        const recipientEmail = staffRecord?.email || null;
        const recipientPhone = staffRecord?.phone || null;

        // CHANNEL 1: IN-APP NOTIFICATION
        const inAppIdempotencyKey = `rem_${b.id}_${matchedStage}_${todayStr}_in_app_${rId}`;

        // Check if reminder was already recorded in DB
        const { data: existingLog } = await supabase
          .from("bill_reminder_logs")
          .select("id")
          .eq("idempotency_key", inAppIdempotencyKey)
          .maybeSingle();

        if (existingLog) {
          result.remindersSkipped += 1;
          result.details.push({
            billId: b.id,
            billNumber: b.bill_number,
            stage: matchedStage,
            channel: "in_app",
            status: "skipped",
            recipient: recipientName,
            reason: "Idempotent: Already recorded for today.",
          });
        } else {
          // Insert in-app notification
          const { error: notifErr } = await supabase.from("staff_notifications").insert({
            recipient_id: rId,
            branch_id: b.branch_id,
            title,
            message,
            type: "bill_reminder",
            link: `/admin/bills?id=${b.id}`,
            metadata: {
              bill_id: b.id,
              bill_number: b.bill_number,
              stage: matchedStage,
              due_date: b.due_date,
              outstanding_balance: liveBalance,
            },
          });

          // Insert audit and reminder delivery log
          await supabase.from("bill_reminder_logs").insert({
            bill_id: b.id,
            reminder_stage: matchedStage,
            scheduled_for: todayStr,
            recipient_id: rId,
            recipient_name: recipientName,
            recipient_email: recipientEmail,
            recipient_phone: recipientPhone,
            channel: "in_app",
            delivery_status: notifErr ? "failed" : "sent",
            delivery_error: notifErr?.message || null,
            idempotency_key: inAppIdempotencyKey,
            outstanding_balance_at_send: liveBalance,
            details: {
              diff_days: diffDays,
              branch_name: branchName,
            },
          });

          if (notifErr) {
            result.remindersFailed += 1;
            result.details.push({
              billId: b.id,
              billNumber: b.bill_number,
              stage: matchedStage,
              channel: "in_app",
              status: "failed",
              recipient: recipientName,
              error: notifErr.message,
            });
          } else {
            result.remindersCreated += 1;
            result.details.push({
              billId: b.id,
              billNumber: b.bill_number,
              stage: matchedStage,
              channel: "in_app",
              status: "sent",
              recipient: recipientName,
            });

            // Record audit log
            await supabase.from("bill_audit_logs").insert({
              bill_id: b.id,
              actor_id: null,
              action: "BILL_REMINDER_SENT",
              notes: `[In-App] Reminder (${matchedStage}) sent to ${recipientName} for balance ${formatPHP(liveBalance)}`,
              details: {
                stage: matchedStage,
                recipient_id: rId,
                recipient_name: recipientName,
                channel: "in_app",
                outstanding_balance: liveBalance,
              },
            });
          }
        }

        // CHANNEL 2: EMAIL (Resend) — only if email is configured and recipient has email
        if (!options?.forceInAppOnly && recipientEmail && process.env.RESEND_API_KEY) {
          const emailIdempotencyKey = `rem_${b.id}_${matchedStage}_${todayStr}_email_${rId}`;
          const { data: existingEmailLog } = await supabase
            .from("bill_reminder_logs")
            .select("id")
            .eq("idempotency_key", emailIdempotencyKey)
            .maybeSingle();

          if (!existingEmailLog) {
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                <div style="border-bottom: 2px solid #f43f5e; padding-bottom: 12px; margin-bottom: 16px;">
                  <span style="font-size: 11px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 0.05em;">Cindyrella Clinic Management</span>
                  <h2 style="color: #0f172a; margin: 6px 0 0 0; font-size: 18px;">${stageLabel}</h2>
                </div>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello <strong>${recipientName}</strong>,</p>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">This is an automated reminder regarding the upcoming bill payable:</p>
                <div style="background: #f8fafc; border-left: 4px solid #f43f5e; padding: 14px 16px; margin: 16px 0; border-radius: 4px;">
                  <div style="font-size: 16px; font-weight: bold; color: #0f172a;">${b.title}</div>
                  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Vendor: <strong>${b.vendor_or_payee}</strong> | Branch: <strong>${branchName}</strong></div>
                  <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Due Date: <strong>${b.due_date}</strong></div>
                  <div style="font-size: 18px; font-weight: 800; color: #e11d48; margin-top: 8px;">Outstanding: ${formatPHP(liveBalance)}</div>
                </div>
                <div style="margin: 24px 0 12px 0;">
                  <a href="${billUrl}" style="background: #e11d48; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">View Bill Details</a>
                </div>
                <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                  Cindyrella Aesthetic & Wellness • Financial Accounting & Disbursements • Confidential
                </p>
              </div>
            `;

            const emailRes = await sendEmail({
              to: recipientEmail,
              subject: title,
              html: emailHtml,
            });

            await supabase.from("bill_reminder_logs").insert({
              bill_id: b.id,
              reminder_stage: matchedStage,
              scheduled_for: todayStr,
              recipient_id: rId,
              recipient_name: recipientName,
              recipient_email: recipientEmail,
              channel: "email",
              delivery_status: emailRes.sent ? "sent" : "skipped",
              delivery_error: emailRes.reason || null,
              idempotency_key: emailIdempotencyKey,
              outstanding_balance_at_send: liveBalance,
            });
          }
        }

        // CHANNEL 3: SMS (Twilio) — only if SMS is configured
        if (!options?.forceInAppOnly && recipientPhone && process.env.TWILIO_ACCOUNT_SID) {
          const smsIdempotencyKey = `rem_${b.id}_${matchedStage}_${todayStr}_sms_${rId}`;
          const { data: existingSmsLog } = await supabase
            .from("bill_reminder_logs")
            .select("id")
            .eq("idempotency_key", smsIdempotencyKey)
            .maybeSingle();

          if (!existingSmsLog) {
            const smsBody = `[CINDYRELLA] ${stageLabel}: ${b.title} (${branchName}) is due on ${b.due_date}. Balance: ${formatPHP(liveBalance)}. View: ${billUrl}`;
            const smsRes = await sendSms(recipientPhone, smsBody);

            await supabase.from("bill_reminder_logs").insert({
              bill_id: b.id,
              reminder_stage: matchedStage,
              scheduled_for: todayStr,
              recipient_id: rId,
              recipient_name: recipientName,
              recipient_phone: recipientPhone,
              channel: "sms",
              delivery_status: smsRes.sent ? "sent" : "skipped",
              delivery_error: smsRes.reason || null,
              idempotency_key: smsIdempotencyKey,
              outstanding_balance_at_send: liveBalance,
            });
          }
        }
      }
    }

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[reminder-engine:fatalError]", err);
    return {
      ...result,
      success: false,
      details: [
        {
          billId: "error",
          billNumber: "ERR",
          stage: "runtime",
          channel: "in_app",
          status: "failed",
          error: errorMsg,
        },
      ],
    };
  }
}
