// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Cron Endpoint for Automated Bill Reminders & Recurring Bill Generation
// Supported on Vercel Cron, pg_cron, GitHub Actions, or local scheduler
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { runReminderAutomation } from "@/lib/bills/reminder-engine";
import { generateRecurringBills } from "@/lib/bills/recurring-generator";
import { APP_TIMEZONE, getLocalDateString } from "@/lib/bills/bill-calculator";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow sufficient time for batch processing

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  // 1. Authorization check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const bearer = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
    const urlSecret = req.nextUrl.searchParams.get("secret");

    if (bearer !== cronSecret && urlSecret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized cron execution request." },
        { status: 401 }
      );
    }
  }

  const todayStr = getLocalDateString(new Date(), APP_TIMEZONE);
  const startTime = Date.now();

  try {
    // 2. Step 1: Generate recurring bills due today or earlier
    const recurringResult = await generateRecurringBills({ referenceDateStr: todayStr });

    // 3. Step 2: Run automated reminder engine across eligible bills
    const reminderResult = await runReminderAutomation({ referenceDateStr: todayStr });

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      executionDate: todayStr,
      timezone: APP_TIMEZONE,
      durationMs,
      recurringBills: {
        generatedCount: recurringResult.generatedCount,
        skippedCount: recurringResult.skippedCount,
        errors: recurringResult.errors,
      },
      reminders: {
        processedBills: reminderResult.processedBillsCount,
        remindersCreated: reminderResult.remindersCreated,
        remindersSkipped: reminderResult.remindersSkipped,
        remindersFailed: reminderResult.remindersFailed,
      },
      details: reminderResult.details,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[cron/bill-reminders:error]", err);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        executionDate: todayStr,
      },
      { status: 500 }
    );
  }
}
