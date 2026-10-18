// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Payroll Calculation Engine: Authoritative Server-side Computation
// Computes Gross, Statutory Deductions, Taxes, Overtime, Commissions, and Net Pay
// ==============================================================================

import {
  calculateSSS,
  calculatePhilHealth,
  calculatePagIbig,
  calculateWithholdingTax,
  calculateOvertimePay,
  OvertimeType,
} from "./philippine-tax";
import {
  EmployeeCompensation,
  AttendanceRecord,
  CommissionRecord,
  PayrollItem,
  EarningsDetail,
  DeductionsDetail,
  AttendanceSummary,
} from "@/app/admin/(dashboard)/payroll/types";

export interface CalculationOptions {
  payrollRunId: string;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  frequency: "semi_monthly" | "monthly" | "weekly" | "custom";
  contributionSchedule?: "split_50_50" | "first_cutoff_only" | "second_cutoff_only";
  cutoffIndex?: number; // 1 for 1st half, 2 for 2nd half
}

export function computeEmployeePayrollItem(
  comp: EmployeeCompensation,
  attendance: AttendanceRecord[],
  commissions: CommissionRecord[],
  options: CalculationOptions
): PayrollItem {
  const frequency = options.frequency || comp.payroll_frequency || "semi_monthly";
  const schedule = options.contributionSchedule || "split_50_50";
  const cutoffIndex = options.cutoffIndex || 1;

  // 1. Attendance Summary
  let daysPresent = 0;
  let daysAbsent = 0;
  let daysOnLeave = 0;
  let totalHoursWorked = 0;
  let totalLateMinutes = 0;
  let totalUndertimeMinutes = 0;
  let approvedOTHours = 0;
  let totalOTPay = 0;

  // Track holiday pay if worked on holidays
  const holidayPay = 0;

  attendance.forEach((att) => {
    if (att.status === "present") {
      daysPresent++;
      totalHoursWorked += Number(att.hours_worked || 0);
      totalLateMinutes += Number(att.late_minutes || 0);
      totalUndertimeMinutes += Number(att.undertime_minutes || 0);
    } else if (att.status === "absent") {
      daysAbsent++;
    } else if (att.status === "on_leave") {
      daysOnLeave++;
      if (att.is_approved_leave) {
        // Paid approved leave counts as paid hours
        totalHoursWorked += 8;
        daysPresent++;
      } else {
        daysAbsent++;
      }
    }

    // Process Overtime if approved and employee is eligible
    if (
      comp.overtime_eligible &&
      att.overtime_status === "approved" &&
      att.overtime_hours > 0
    ) {
      approvedOTHours += Number(att.overtime_hours);
      const otAmt = calculateOvertimePay(
        comp.hourly_rate,
        att.overtime_hours,
        att.overtime_type as OvertimeType
      );
      totalOTPay += otAmt;
    }
  });

  // 2. Base Salary Calculation based on Salary Type
  let basicPay = 0;
  const standardDailyRate =
    comp.daily_rate > 0
      ? comp.daily_rate
      : comp.basic_salary > 0
      ? Math.round((comp.basic_salary / 26) * 100) / 100
      : 0;

  const standardHourlyRate =
    comp.hourly_rate > 0
      ? comp.hourly_rate
      : standardDailyRate > 0
      ? Math.round((standardDailyRate / 8) * 100) / 100
      : 0;

  if (comp.salary_type === "monthly") {
    if (frequency === "semi_monthly") {
      basicPay = Math.round((comp.basic_salary / 2) * 100) / 100;
    } else if (frequency === "monthly") {
      basicPay = comp.basic_salary;
    } else if (frequency === "weekly") {
      basicPay = Math.round((comp.basic_salary / 4.33) * 100) / 100;
    } else {
      basicPay = Math.round((comp.basic_salary / 2) * 100) / 100;
    }
  } else if (comp.salary_type === "daily") {
    basicPay = Math.round(daysPresent * standardDailyRate * 100) / 100;
  } else if (comp.salary_type === "hourly") {
    basicPay = Math.round(totalHoursWorked * standardHourlyRate * 100) / 100;
  } else if (comp.salary_type === "commission_based") {
    basicPay = 0.0;
  } else if (comp.salary_type === "mixed") {
    // Mixed: guaranteed base + commissions
    if (frequency === "semi_monthly") {
      basicPay = Math.round((comp.basic_salary / 2) * 100) / 100;
    } else {
      basicPay = comp.basic_salary;
    }
  }

  // 3. Approved Commissions
  let totalCommissionPay = 0;
  if (comp.commission_eligible && commissions.length > 0) {
    commissions.forEach((c) => {
      if (c.status === "approved" || c.status === "pending") {
        totalCommissionPay += Number(c.commission_amount || 0);
      }
    });
  }
  totalCommissionPay = Math.round(totalCommissionPay * 100) / 100;

  // 4. Allowances (Prorated for semi-monthly if applicable)
  let totalAllowancePay = 0;
  let taxableAllowances = 0;
  const allowancesList = comp.allowances || [];

  allowancesList.forEach((al) => {
    let amt = Number(al.amount || 0);
    if (frequency === "semi_monthly") {
      amt = Math.round((amt / 2) * 100) / 100;
    }
    totalAllowancePay += amt;
    if (al.is_taxable) {
      taxableAllowances += amt;
    }
  });

  // 5. Tardy, Undertime, and Absence Deductions
  const minuteRate = standardHourlyRate > 0 ? standardHourlyRate / 60 : 0;
  const lateDeduction = Math.round(totalLateMinutes * minuteRate * 100) / 100;
  const undertimeDeduction =
    Math.round(totalUndertimeMinutes * minuteRate * 100) / 100;
  const lateUndertimeTotal = lateDeduction + undertimeDeduction;

  // Unexcused Absence Deduction (for monthly salaried employees)
  let absenceDeduction = 0;
  if (comp.salary_type === "monthly" && daysAbsent > 0) {
    absenceDeduction = Math.round(daysAbsent * standardDailyRate * 100) / 100;
  }

  // 6. Gross Pay
  const grossPay =
    Math.round(
      (basicPay +
        totalOTPay +
        totalCommissionPay +
        totalAllowancePay +
        holidayPay) *
        100
    ) / 100;

  // 7. Statutory Contributions
  // Compute monthly equivalent salary basis for statutory tiers
  const monthlySalaryBasis =
    comp.basic_salary > 0
      ? comp.basic_salary
      : standardDailyRate * 26;

  let sssEE = 0;
  let sssER = 0;
  let phEE = 0;
  let phER = 0;
  let pagibigEE = 0;
  let pagibigER = 0;

  if (comp.sss_enabled) {
    const sss = calculateSSS(monthlySalaryBasis);
    if (frequency === "semi_monthly") {
      if (schedule === "split_50_50") {
        sssEE = Math.round((sss.employeeShare / 2) * 100) / 100;
        sssER = Math.round((sss.employerShare / 2) * 100) / 100;
      } else if (schedule === "first_cutoff_only") {
        sssEE = cutoffIndex === 1 ? sss.employeeShare : 0;
        sssER = cutoffIndex === 1 ? sss.employerShare : 0;
      } else {
        sssEE = cutoffIndex === 2 ? sss.employeeShare : 0;
        sssER = cutoffIndex === 2 ? sss.employerShare : 0;
      }
    } else {
      sssEE = sss.employeeShare;
      sssER = sss.employerShare;
    }
  }

  if (comp.philhealth_enabled) {
    const ph = calculatePhilHealth(monthlySalaryBasis);
    if (frequency === "semi_monthly") {
      if (schedule === "split_50_50") {
        phEE = Math.round((ph.employeeShare / 2) * 100) / 100;
        phER = Math.round((ph.employerShare / 2) * 100) / 100;
      } else if (schedule === "second_cutoff_only") {
        phEE = cutoffIndex === 2 ? ph.employeeShare : 0;
        phER = cutoffIndex === 2 ? ph.employerShare : 0;
      } else {
        phEE = cutoffIndex === 1 ? ph.employeeShare : 0;
        phER = cutoffIndex === 1 ? ph.employerShare : 0;
      }
    } else {
      phEE = ph.employeeShare;
      phER = ph.employerShare;
    }
  }

  if (comp.pagibig_enabled) {
    const pi = calculatePagIbig(monthlySalaryBasis, comp.pagibig_custom_amount);
    if (frequency === "semi_monthly") {
      if (schedule === "split_50_50") {
        pagibigEE = Math.round((pi.employeeShare / 2) * 100) / 100;
        pagibigER = Math.round((pi.employerShare / 2) * 100) / 100;
      } else if (schedule === "second_cutoff_only") {
        pagibigEE = cutoffIndex === 2 ? pi.employeeShare : 0;
        pagibigER = cutoffIndex === 2 ? pi.employerShare : 0;
      } else {
        pagibigEE = cutoffIndex === 1 ? pi.employeeShare : 0;
        pagibigER = cutoffIndex === 1 ? pi.employerShare : 0;
      }
    } else {
      pagibigEE = pi.employeeShare;
      pagibigER = pi.employerShare;
    }
  }

  // 8. Withholding Tax Calculation (TRAIN Law)
  // Taxable Base = (Gross - Non-Taxable Allowances - Tardiness/Absence) - (SSS EE + PhilHealth EE + Pag-IBIG EE)
  const taxableGross =
    basicPay +
    totalOTPay +
    totalCommissionPay +
    taxableAllowances -
    lateUndertimeTotal -
    absenceDeduction;

  const totalMandatoryStatutoryEE = sssEE + phEE + pagibigEE;
  const taxableNetIncome = Math.max(0, taxableGross - totalMandatoryStatutoryEE);

  let withholdingTax = 0;
  if (!comp.tax_exempt) {
    const taxRes = calculateWithholdingTax(
      taxableNetIncome,
      frequency === "monthly" ? "monthly" : "semi_monthly",
      comp.is_minimum_wage_earner
    );
    withholdingTax = taxRes.taxAmount;
  }

  // 9. Total Deductions & Net Pay
  const totalDeductions =
    Math.round(
      (sssEE +
        phEE +
        pagibigEE +
        withholdingTax +
        lateUndertimeTotal +
        absenceDeduction) *
        100
    ) / 100;

  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  // 10. Total Employer Cost (Gross + Employer Contributions)
  const totalEmployerContributions =
    Math.round((sssER + phER + pagibigER) * 100) / 100;
  const totalEmployerCost =
    Math.round((grossPay + totalEmployerContributions) * 100) / 100;

  // 11. Itemized Earnings Breakdown
  const earningsBreakdown: EarningsDetail[] = [
    { code: "BASIC", label: "Basic Pay", amount: basicPay, is_taxable: true },
  ];
  if (totalOTPay > 0) {
    earningsBreakdown.push({
      code: "OT",
      label: `Overtime Pay (${approvedOTHours.toFixed(1)} hrs)`,
      amount: totalOTPay,
      is_taxable: true,
    });
  }
  if (totalCommissionPay > 0) {
    earningsBreakdown.push({
      code: "COMM",
      label: "Commissions",
      amount: totalCommissionPay,
      is_taxable: true,
    });
  }
  allowancesList.forEach((al) => {
    let amt = Number(al.amount || 0);
    if (frequency === "semi_monthly") amt = Math.round((amt / 2) * 100) / 100;
    earningsBreakdown.push({
      code: "ALW",
      label: al.name,
      amount: amt,
      is_taxable: al.is_taxable,
    });
  });

  // 12. Itemized Deductions Breakdown
  const deductionsBreakdown: DeductionsDetail[] = [];
  if (sssEE > 0) {
    deductionsBreakdown.push({
      code: "SSS_EE",
      label: "SSS Contribution (Employee)",
      amount: sssEE,
      is_statutory: true,
    });
  }
  if (phEE > 0) {
    deductionsBreakdown.push({
      code: "PH_EE",
      label: "PhilHealth (Employee)",
      amount: phEE,
      is_statutory: true,
    });
  }
  if (pagibigEE > 0) {
    deductionsBreakdown.push({
      code: "HDMF_EE",
      label: "Pag-IBIG / HDMF",
      amount: pagibigEE,
      is_statutory: true,
    });
  }
  if (withholdingTax > 0) {
    deductionsBreakdown.push({
      code: "TAX",
      label: "BIR Withholding Tax",
      amount: withholdingTax,
      is_statutory: true,
    });
  }
  if (lateUndertimeTotal > 0) {
    deductionsBreakdown.push({
      code: "LATE_UT",
      label: `Tardiness & Undertime (${totalLateMinutes + totalUndertimeMinutes} mins)`,
      amount: lateUndertimeTotal,
      is_statutory: false,
    });
  }
  if (absenceDeduction > 0) {
    deductionsBreakdown.push({
      code: "ABS",
      label: `Absence Deduction (${daysAbsent} days)`,
      amount: absenceDeduction,
      is_statutory: false,
    });
  }

  const attendanceSummary: AttendanceSummary = {
    days_present: daysPresent,
    days_absent: daysAbsent,
    days_on_leave: daysOnLeave,
    hours_worked: totalHoursWorked,
    late_minutes: totalLateMinutes,
    undertime_minutes: totalUndertimeMinutes,
    approved_ot_hours: approvedOTHours,
  };

  const payslipNumber = `PS-${options.runNumber.replace(/^PR-/, "")}-${comp.employee_id.slice(0, 5).toUpperCase()}`;

  return {
    id: `item-${comp.employee_id}`,
    payroll_run_id: options.payrollRunId,
    employee_id: comp.employee_id,
    employee_name: comp.staff?.full_name || "Employee",
    position: comp.position,
    branch_id: comp.branch_id,
    branch_name: comp.staff?.branches?.name || "Main Branch",
    salary_type: comp.salary_type,
    base_salary_rate: comp.basic_salary,
    days_worked: daysPresent,
    hours_worked: totalHoursWorked,
    basic_pay: basicPay,
    overtime_pay: totalOTPay,
    commission_pay: totalCommissionPay,
    allowance_pay: totalAllowancePay,
    holiday_pay: holidayPay,
    other_earnings: 0.0,
    gross_pay: grossPay,
    sss_employee: sssEE,
    sss_employer: sssER,
    philhealth_employee: phEE,
    philhealth_employer: phER,
    pagibig_employee: pagibigEE,
    pagibig_employer: pagibigER,
    withholding_tax: withholdingTax,
    late_undertime_deduction: lateUndertimeTotal,
    absence_deduction: absenceDeduction,
    loan_advance_deduction: 0.0,
    other_deductions: 0.0,
    total_deductions: totalDeductions,
    net_pay: netPay,
    total_employer_cost: totalEmployerCost,
    earnings_breakdown: earningsBreakdown,
    deductions_breakdown: deductionsBreakdown,
    attendance_summary: attendanceSummary,
    status: "pending",
    payslip_number: payslipNumber,
    created_at: new Date().toISOString(),
  };
}
