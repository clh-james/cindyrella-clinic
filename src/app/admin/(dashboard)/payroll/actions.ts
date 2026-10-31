"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import {
  EmployeeCompensation,
  AttendanceRecord,
  CommissionRecord,
  PayrollItem,
} from "./types";
import { computeEmployeePayrollItem } from "@/lib/payroll/calculation-engine";
import { calculate13thMonthPay } from "@/lib/payroll/philippine-tax";

function generateRef(prefix: string) {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

// ==============================================================================
// 1. EMPLOYEE COMPENSATION MANAGEMENT
// ==============================================================================

export async function saveEmployeeCompensation(data: Partial<EmployeeCompensation>) {
  await requireStaff();
  const canManage = await hasServerPermission("payroll.settings");
  if (!canManage) {
    const isSuperAdmin = await hasServerPermission("users.assign_role");
    if (!isSuperAdmin) throw new Error("Unauthorized to manage employee salary settings.");
  }

  const supabase = createAdminClient();

  try {
    const payload = {
      employee_id: data.employee_id,
      branch_id: data.branch_id || null,
      position: data.position || "Staff",
      employment_status: data.employment_status || "active",
      employment_type: data.employment_type || "regular",
      salary_type: data.salary_type || "monthly",
      basic_salary: Number(data.basic_salary || 0),
      daily_rate: Number(data.daily_rate || 0),
      hourly_rate: Number(data.hourly_rate || 0),
      payroll_frequency: data.payroll_frequency || "semi_monthly",
      effective_date: data.effective_date || new Date().toISOString().slice(0, 10),
      is_current: true,
      allowances: data.allowances || [],
      commission_eligible: !!data.commission_eligible,
      overtime_eligible: data.overtime_eligible !== false,
      sss_enabled: data.sss_enabled !== false,
      philhealth_enabled: data.philhealth_enabled !== false,
      pagibig_enabled: data.pagibig_enabled !== false,
      pagibig_custom_amount: Number(data.pagibig_custom_amount || 200),
      tax_exempt: !!data.tax_exempt,
      is_minimum_wage_earner: !!data.is_minimum_wage_earner,
      bank_name: data.bank_name || null,
      bank_account_number: data.bank_account_number || null,
      bank_account_name: data.bank_account_name || null,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (data.id && !data.id.startsWith("mock-") && !data.id.startsWith("comp-")) {
      // Update existing
      const { error } = await supabase
        .from("employee_compensation")
        .update(payload)
        .eq("id", data.id);

      if (error) throw error;
    } else {
      // Upsert by employee_id or insert
      const { error } = await supabase
        .from("employee_compensation")
        .upsert(payload, { onConflict: "employee_id" });

      if (error) {
        // Fallback plain insert if conflict target differs
        await supabase.from("employee_compensation").insert(payload);
      }
    }

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error saving salary configuration";
    return { success: false, error: message };
  }
}

// ==============================================================================
// 2. ATTENDANCE & OVERTIME MANAGEMENT
// ==============================================================================

export async function logAttendance(record: Partial<AttendanceRecord>) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const payload = {
      employee_id: record.employee_id,
      branch_id: record.branch_id || staff.branchId || null,
      work_date: record.work_date || new Date().toISOString().slice(0, 10),
      time_in: record.time_in || null,
      time_out: record.time_out || null,
      hours_worked: Number(record.hours_worked || 8),
      late_minutes: Number(record.late_minutes || 0),
      undertime_minutes: Number(record.undertime_minutes || 0),
      status: record.status || "present",
      leave_type: record.leave_type || null,
      is_approved_leave: !!record.is_approved_leave,
      overtime_hours: Number(record.overtime_hours || 0),
      overtime_type: record.overtime_type || "regular_workday",
      overtime_status: record.overtime_status || "none",
      overtime_approved_by: record.overtime_status === "approved" ? staff.id : null,
      notes: record.notes || null,
    };

    const { error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "employee_id,work_date" });

    if (error) throw error;

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error logging attendance";
    return { success: false, error: message };
  }
}

export async function approveOvertime(attendanceId: string, isApproved: boolean) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("attendance_records")
      .update({
        overtime_status: isApproved ? "approved" : "rejected",
        overtime_approved_by: isApproved ? staff.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attendanceId);

    if (error) throw error;
    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating overtime status";
    return { success: false, error: message };
  }
}

// ==============================================================================
// 3. COMMISSION CLAIMS & ATTRIBUTIONS
// ==============================================================================

export async function createCommissionRecord(data: Partial<CommissionRecord>) {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    const baseAmt = Number(data.base_amount || 0);
    const rate = Number(data.commission_rate || 0);
    const split = Number(data.split_ratio || 1.0);
    const isPct = data.is_percentage !== false;

    const commissionAmt = isPct
      ? Math.round(baseAmt * (rate / 100) * split * 100) / 100
      : Math.round(rate * split * 100) / 100;

    const payload = {
      employee_id: data.employee_id,
      branch_id: data.branch_id || null,
      source_type: data.source_type || "manual_service",
      source_id: data.source_id || null,
      reference_number: data.reference_number || generateRef("COMM"),
      item_name: data.item_name || "Treatment Service",
      base_amount: baseAmt,
      commission_rate: rate,
      is_percentage: isPct,
      commission_amount: commissionAmt,
      split_ratio: split,
      date_earned: data.date_earned || new Date().toISOString().slice(0, 10),
      status: data.status || "pending",
      notes: data.notes || null,
    };

    const { error } = await supabase.from("commission_records").insert(payload);
    if (error) throw error;

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating commission claim";
    return { success: false, error: message };
  }
}

export async function approveCommission(commissionId: string, isApproved: boolean) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("commission_records")
      .update({
        status: isApproved ? "approved" : "rejected",
        approved_by: isApproved ? staff.id : null,
      })
      .eq("id", commissionId);

    if (error) throw error;
    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error approving commission";
    return { success: false, error: message };
  }
}

// ==============================================================================
// 4. PAYROLL PROCESSING WORKFLOW & CALCULATION RUNS
// ==============================================================================

export async function createPayrollRun(params: {
  title: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  cutoffFrequency: "semi_monthly" | "monthly" | "weekly" | "custom";
  branchId?: string | null;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const runNumber = generateRef("PR");
    const payload = {
      run_number: runNumber,
      title: params.title,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      pay_date: params.payDate,
      cutoff_frequency: params.cutoffFrequency,
      branch_id: params.branchId || null,
      status: "draft",
      created_by: staff.id,
      total_employees: 0,
      total_gross_pay: 0,
      total_deductions: 0,
      total_net_pay: 0,
      total_employer_contributions: 0,
    };

    const { data, error } = await supabase
      .from("payroll_runs")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Log event in audit logs
    await supabase.from("payroll_audit_logs").insert({
      event_type: "PAYROLL_CREATED",
      actor_id: staff.id,
      actor_name: staff.fullName,
      target_id: data.id,
      branch_id: params.branchId || null,
      details: { runNumber, title: params.title },
    });

    revalidatePath("/admin/payroll");
    return { success: true, run: data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating payroll run";
    return { success: false, error: message };
  }
}

export async function calculatePayrollRun(payrollRunId: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // 1. Fetch Payroll Run
    const { data: run, error: runErr } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", payrollRunId)
      .single();

    if (runErr || !run) throw new Error("Payroll run not found.");

    if (run.status === "approved" || run.status === "released") {
      throw new Error("Cannot recalculate an approved or released payroll run.");
    }

    // 2. Fetch Employee Compensations
    let compQuery = supabase
      .from("employee_compensation")
      .select("*, staff(id, full_name, branch_id, branches(name))")
      .eq("is_current", true)
      .eq("employment_status", "active");

    if (run.branch_id) {
      compQuery = compQuery.eq("branch_id", run.branch_id);
    }

    const { data: compensations, error: compErr } = await compQuery;
    if (compErr || !compensations || compensations.length === 0) {
      throw new Error("No active employee compensation records found for this branch/period.");
    }

    // 3. Fetch Attendance in range
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("*")
      .gte("work_date", run.period_start)
      .lte("work_date", run.period_end);

    // 4. Fetch Approved Commissions in range
    const { data: commissions } = await supabase
      .from("commission_records")
      .select("*")
      .gte("date_earned", run.period_start)
      .lte("date_earned", run.period_end)
      .in("status", ["approved", "pending"]);

    // Determine cutoff index (1st half if start day <= 5, 2nd half if start day > 10)
    const startDay = new Date(run.period_start).getDate();
    const cutoffIndex = startDay > 10 ? 2 : 1;

    // Fetch late penalty rate from payroll_settings (defaults to 10 pesos/minute)
    let lateRatePerMinute = 10;
    try {
      const { data: scheduleSetting } = await supabase
        .from("payroll_settings")
        .select("value")
        .eq("key", "schedule_policy")
        .maybeSingle();

      const spVal = scheduleSetting?.value as Record<string, unknown> | undefined;
      if (spVal && typeof spVal.late_rate_per_minute === "number") {
        lateRatePerMinute = spVal.late_rate_per_minute;
      }
    } catch {
      lateRatePerMinute = 10;
    }

    // 5. Calculate each employee item
    const computedItems: PayrollItem[] = [];
    const attList = (attendance || []) as AttendanceRecord[];
    const commList = (commissions || []) as CommissionRecord[];

    for (const comp of compensations as unknown as EmployeeCompensation[]) {
      const empAtt = attList.filter((a) => a.employee_id === comp.employee_id);
      const empComm = commList.filter((c) => c.employee_id === comp.employee_id);

      const item = computeEmployeePayrollItem(comp, empAtt, empComm, {
        payrollRunId: run.id,
        runNumber: run.run_number,
        periodStart: run.period_start,
        periodEnd: run.period_end,
        frequency: run.cutoff_frequency,
        cutoffIndex,
        lateRatePerMinute,
      });

      computedItems.push(item);
    }

    // 6. Delete previous draft items for this run and insert new ones
    await supabase.from("payroll_items").delete().eq("payroll_run_id", run.id);

    const itemsPayload = computedItems.map((item) => ({
      payroll_run_id: item.payroll_run_id,
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      position: item.position,
      branch_id: item.branch_id,
      branch_name: item.branch_name,
      salary_type: item.salary_type,
      base_salary_rate: item.base_salary_rate,
      days_worked: item.days_worked,
      hours_worked: item.hours_worked,
      basic_pay: item.basic_pay,
      overtime_pay: item.overtime_pay,
      commission_pay: item.commission_pay,
      allowance_pay: item.allowance_pay,
      holiday_pay: item.holiday_pay,
      other_earnings: item.other_earnings,
      gross_pay: item.gross_pay,
      sss_employee: item.sss_employee,
      sss_employer: item.sss_employer,
      philhealth_employee: item.philhealth_employee,
      philhealth_employer: item.philhealth_employer,
      pagibig_employee: item.pagibig_employee,
      pagibig_employer: item.pagibig_employer,
      withholding_tax: item.withholding_tax,
      late_undertime_deduction: item.late_undertime_deduction,
      absence_deduction: item.absence_deduction,
      loan_advance_deduction: item.loan_advance_deduction,
      other_deductions: item.other_deductions,
      total_deductions: item.total_deductions,
      net_pay: item.net_pay,
      total_employer_cost: item.total_employer_cost,
      earnings_breakdown: item.earnings_breakdown,
      deductions_breakdown: item.deductions_breakdown,
      attendance_summary: item.attendance_summary,
      status: "pending",
      payslip_number: item.payslip_number,
    }));

    const { error: insertErr } = await supabase.from("payroll_items").insert(itemsPayload);
    if (insertErr) throw insertErr;

    // 7. Update Totals on Payroll Run
    const totalGross = computedItems.reduce((acc, i) => acc + i.gross_pay, 0);
    const totalDed = computedItems.reduce((acc, i) => acc + i.total_deductions, 0);
    const totalNet = computedItems.reduce((acc, i) => acc + i.net_pay, 0);
    const totalER = computedItems.reduce((acc, i) => acc + (i.sss_employer + i.philhealth_employer + i.pagibig_employer), 0);

    await supabase
      .from("payroll_runs")
      .update({
        status: "for_review",
        total_employees: computedItems.length,
        total_gross_pay: Math.round(totalGross * 100) / 100,
        total_deductions: Math.round(totalDed * 100) / 100,
        total_net_pay: Math.round(totalNet * 100) / 100,
        total_employer_contributions: Math.round(totalER * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    // Audit log
    await supabase.from("payroll_audit_logs").insert({
      event_type: "PAYROLL_CALCULATED",
      actor_id: staff.id,
      actor_name: staff.fullName,
      target_id: run.id,
      branch_id: run.branch_id,
      details: {
        employeesCount: computedItems.length,
        totalGross,
        totalNet,
      },
    });

    revalidatePath("/admin/payroll");
    return { success: true, count: computedItems.length, totalNet };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error calculating payroll";
    return { success: false, error: message };
  }
}

export async function submitForApproval(payrollRunId: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status: "for_approval",
        reviewed_by: staff.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payrollRunId);

    if (error) throw error;

    await supabase.from("payroll_audit_logs").insert({
      event_type: "PAYROLL_SUBMITTED",
      actor_id: staff.id,
      actor_name: staff.fullName,
      target_id: payrollRunId,
    });

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error submitting payroll for approval";
    return { success: false, error: message };
  }
}

export async function approvePayrollRun(payrollRunId: string, comments?: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // Verify separation of duties if applicable
    const { data: run } = await supabase
      .from("payroll_runs")
      .select("created_by, status")
      .eq("id", payrollRunId)
      .single();

    if (!run) throw new Error("Payroll run not found.");

    // Prevent self-approval if preparer matches, unless super_admin
    const isSuperAdmin = await hasServerPermission("users.assign_role");
    if (run.created_by === staff.id && !isSuperAdmin) {
      throw new Error("Separation of duties required: The payroll preparer cannot approve their own payroll run.");
    }

    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status: "approved",
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        approval_comments: comments || "Approved for disbursement.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payrollRunId);

    if (error) throw error;

    await supabase.from("payroll_audit_logs").insert({
      event_type: "PAYROLL_APPROVED",
      actor_id: staff.id,
      actor_name: staff.fullName,
      target_id: payrollRunId,
      reason: comments,
    });

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error approving payroll";
    return { success: false, error: message };
  }
}

export async function releasePayrollRun(payrollRunId: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payrollRunId);

    if (error) throw error;

    // Mark all payroll items as paid
    await supabase
      .from("payroll_items")
      .update({ status: "paid" })
      .eq("payroll_run_id", payrollRunId);

    await supabase.from("payroll_audit_logs").insert({
      event_type: "PAYROLL_RELEASED",
      actor_id: staff.id,
      actor_name: staff.fullName,
      target_id: payrollRunId,
    });

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error releasing payroll";
    return { success: false, error: message };
  }
}

export async function rejectPayrollRun(payrollRunId: string, reason: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status: "draft",
        rejection_reason: reason || "Returned for correction.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payrollRunId);

    if (error) throw error;

    await supabase.from("payroll_audit_logs").insert({
      event_type: "PAYROLL_REJECTED",
      actor_id: staff.id,
      actor_name: staff.fullName,
      target_id: payrollRunId,
      reason,
    });

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error rejecting payroll";
    return { success: false, error: message };
  }
}

// ==============================================================================
// 5. 13th-MONTH PAY CALCULATIONS
// ==============================================================================

export async function calculate13thMonthYearly(year: number, branchId?: string | null) {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    // Fetch all active compensations
    let compQuery = supabase
      .from("employee_compensation")
      .select("*, staff(id, full_name, branch_id, branches(name))")
      .eq("is_current", true)
      .eq("employment_status", "active");

    if (branchId) {
      compQuery = compQuery.eq("branch_id", branchId);
    }

    const { data: compensations, error: compErr } = await compQuery;
    if (compErr || !compensations || compensations.length === 0) {
      throw new Error("No active employees found for 13th-month calculation.");
    }

    // For each employee, estimate or calculate basic earned for the year
    const records = [];
    for (const comp of compensations as unknown as EmployeeCompensation[]) {
      // Annual standard basic salary = monthly * 12 (or daily * 26 * 12)
      const monthlyRate =
        comp.basic_salary > 0
          ? comp.basic_salary
          : comp.daily_rate * 26;

      const totalBasicEarned = monthlyRate * 12;
      const thMonthPay = calculate13thMonthPay(totalBasicEarned, 12);

      records.push({
        year,
        employee_id: comp.employee_id,
        branch_id: comp.branch_id,
        months_worked: 12,
        total_basic_earned: Math.round(totalBasicEarned * 100) / 100,
        thirteenth_month_pay: thMonthPay,
        adjustments: 0.0,
        final_payout: thMonthPay,
        status: "calculated",
      });
    }

    const { error: upsertErr } = await supabase
      .from("thirteenth_month_records")
      .upsert(records, { onConflict: "year,employee_id" });

    if (upsertErr) throw upsertErr;

    revalidatePath("/admin/payroll");
    return { success: true, count: records.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error calculating 13th month pay";
    return { success: false, error: message };
  }
}

export async function update13thMonthAdjustment(
  recordId: string,
  adjustment: number,
  reason: string
) {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: rec } = await supabase
      .from("thirteenth_month_records")
      .select("thirteenth_month_pay")
      .eq("id", recordId)
      .single();

    if (!rec) throw new Error("13th month record not found.");

    const finalPayout = Math.max(0, rec.thirteenth_month_pay + adjustment);

    const { error } = await supabase
      .from("thirteenth_month_records")
      .update({
        adjustments: adjustment,
        adjustment_reason: reason,
        final_payout: finalPayout,
      })
      .eq("id", recordId);

    if (error) throw error;
    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error adjusting 13th month pay";
    return { success: false, error: message };
  }
}

export async function updatePayrollPolicySettings(payload: {
  schedule?: "split_50_50" | "first_cutoff_only" | "second_cutoff_only";
  workingDays?: number;
  dailyHours?: number;
  lateRatePerMinute?: number;
  otApprovalRequired?: boolean;
}) {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: existing } = await supabase
      .from("payroll_settings")
      .select("value")
      .eq("key", "schedule_policy")
      .maybeSingle();

    const currentVal = (existing?.value || {}) as Record<string, unknown>;
    const updatedVal = {
      ...currentVal,
      ...(payload.workingDays !== undefined && { working_days_per_month: payload.workingDays }),
      ...(payload.dailyHours !== undefined && { standard_daily_hours: payload.dailyHours }),
      ...(payload.schedule !== undefined && { contribution_schedule: payload.schedule }),
      ...(payload.lateRatePerMinute !== undefined && { late_rate_per_minute: payload.lateRatePerMinute }),
      ...(payload.otApprovalRequired !== undefined && { require_ot_approval: payload.otApprovalRequired }),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("payroll_settings")
      .upsert({
        key: "schedule_policy",
        value: updatedVal,
        description: "Cutoff rules, late penalty rate (₱10/min), and contribution schedule",
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (error) throw error;
    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update payroll policy settings";
    return { success: false, error: message };
  }
}
