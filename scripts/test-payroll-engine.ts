// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Automated Quality Assurance Test Suite for Employee Payroll Module
// ==============================================================================

import {
  calculateSSS,
  calculatePhilHealth,
  calculatePagIbig,
  calculateWithholdingTax,
  calculateOvertimePay,
  calculate13thMonthPay,
  formatPHP,
} from "../src/lib/payroll/philippine-tax";
import { computeEmployeePayrollItem } from "../src/lib/payroll/calculation-engine";
import { EmployeeCompensation, AttendanceRecord, CommissionRecord } from "../src/app/admin/(dashboard)/payroll/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("\n=======================================================");
console.log("CINDYRELLA PAYROLL MODULE — AUTOMATED QA TEST SUITE");
console.log("=======================================================\n");

// ------------------------------------------------------------------------------
// Test 1: SSS 2025/2026 Statutory Schedule
// ------------------------------------------------------------------------------
console.log("TEST GROUP 1: SSS Statutory Calculation (14% Total: 5% EE, 9.5% ER + EC)");
{
  // Min MSC (₱5,000) for salary <= ₱5,249.99
  const sssMin = calculateSSS(5000);
  assert(sssMin.monthlySalaryCredit === 5000, "SSS Min MSC is ₱5,000");
  assert(sssMin.employeeShare === 250.0, "SSS EE share at ₱5,000 MSC is ₱250 (5%)");
  assert(sssMin.employerShare === 485.0, "SSS ER share at ₱5,000 MSC is ₱485 (9.5% = ₱475 + ₱10 EC)");

  // Mid bracket: ₱20,000 salary -> MSC ₱20,000
  const sssMid = calculateSSS(20000);
  assert(sssMid.monthlySalaryCredit === 20000, "SSS MSC for ₱20,000 is ₱20,000");
  assert(sssMid.employeeShare === 1000.0, "SSS EE share at ₱20,000 MSC is ₱1,000 (5%)");
  assert(sssMid.employerShare === 1930.0, "SSS ER share at ₱20,000 MSC is ₱1,930 (9.5% = ₱1,900 + ₱30 EC)");

  // Max MSC (₱35,000) for salary >= ₱34,750
  const sssMax = calculateSSS(40000);
  assert(sssMax.monthlySalaryCredit === 35000, "SSS Max MSC is capped at ₱35,000");
  assert(sssMax.employeeShare === 1750.0, "SSS EE share at ₱35,000 MSC is ₱1,750 (5%)");
  assert(sssMax.employerShare === 3355.0, "SSS ER share at ₱35,000 MSC is ₱3,355 (9.5% = ₱3,325 + ₱30 EC)");
}

// ------------------------------------------------------------------------------
// Test 2: PhilHealth 5% Premium Rate & Caps
// ------------------------------------------------------------------------------
console.log("\nTEST GROUP 2: PhilHealth Premium (5.0% Total: 2.5% EE, 2.5% ER)");
{
  // Below Floor (e.g. ₱8,000) -> Floor of ₱10,000 applies
  const phLow = calculatePhilHealth(8000);
  assert(phLow.monthlySalaryBasis === 10000, "PhilHealth floor is ₱10,000");
  assert(phLow.employeeShare === 250.0, "PhilHealth EE share at floor is ₱250.00");
  assert(phLow.employerShare === 250.0, "PhilHealth ER share at floor is ₱250.00");

  // Standard (₱30,000)
  const phMid = calculatePhilHealth(30000);
  assert(phMid.employeeShare === 750.0, "PhilHealth EE share for ₱30,000 is ₱750.00 (2.5%)");
  assert(phMid.employerShare === 750.0, "PhilHealth ER share for ₱30,000 is ₱750.00 (2.5%)");

  // Above Ceiling (₱120,000) -> Ceiling of ₱100,000 applies
  const phHigh = calculatePhilHealth(120000);
  assert(phHigh.monthlySalaryBasis === 100000, "PhilHealth ceiling is ₱100,000");
  assert(phHigh.employeeShare === 2500.0, "PhilHealth EE share capped at ₱2,500.00");
  assert(phHigh.employerShare === 2500.0, "PhilHealth ER share capped at ₱2,500.00");
}

// ------------------------------------------------------------------------------
// Test 3: Pag-IBIG (HDMF) Standard ₱200 Cap
// ------------------------------------------------------------------------------
console.log("\nTEST GROUP 3: Pag-IBIG Fund (HDMF) Contribution");
{
  const pi = calculatePagIbig(25000);
  assert(pi.employeeShare === 200.0, "Pag-IBIG standard EE contribution is ₱200.00");
  assert(pi.employerShare === 200.0, "Pag-IBIG standard ER contribution is ₱200.00");

  // Custom upgraded savings
  const piCustom = calculatePagIbig(25000, 500);
  assert(piCustom.employeeShare === 500.0, "Pag-IBIG custom voluntary EE contribution is ₱500.00");
  assert(piCustom.employerShare === 200.0, "Pag-IBIG ER match remains standard ₱200.00");
}

// ------------------------------------------------------------------------------
// Test 4: TRAIN Law BIR Withholding Tax Table
// ------------------------------------------------------------------------------
console.log("\nTEST GROUP 4: BIR TRAIN Law Withholding Tax");
{
  // Minimum Wage Earner (MWE) -> Exempt
  const taxMWE = calculateWithholdingTax(15000, "semi_monthly", true);
  assert(taxMWE.taxAmount === 0, "Minimum Wage Earner is 100% tax exempt");

  // Income below semi-monthly threshold (₱10,000 <= ₱10,417) -> Exempt
  const taxLow = calculateWithholdingTax(10000, "semi_monthly", false);
  assert(taxLow.taxAmount === 0, "Semi-monthly income <= ₱10,417 is exempt (₱0.00)");

  // Tier 2: ₱15,000 -> (15,000 - 10,417) * 15% = 4,583 * 0.15 = 687.45
  const taxTier2 = calculateWithholdingTax(15000, "semi_monthly", false);
  assert(Math.abs(taxTier2.taxAmount - 687.45) < 0.1, `Tax for ₱15,000 semi-monthly is ₱687.45 (Got: ${taxTier2.taxAmount})`);
}

// ------------------------------------------------------------------------------
// Test 5: DOLE Overtime & Holiday Pay Calculations
// ------------------------------------------------------------------------------
console.log("\nTEST GROUP 5: DOLE Overtime Multipliers");
{
  const hourlyRate = 100.0;
  // Regular Workday OT (125%): 4 hrs * 100 * 1.25 = ₱500
  const otReg = calculateOvertimePay(hourlyRate, 4, "regular_workday");
  assert(otReg === 500.0, "Regular Workday OT is 125% (4 hrs @ ₱100/hr = ₱500)");

  // Rest Day Duty (130%): 8 hrs * 100 * 1.30 = ₱1,040
  const otRest = calculateOvertimePay(hourlyRate, 8, "rest_day");
  assert(otRest === 1040.0, "Rest Day duty is 130% (8 hrs @ ₱100/hr = ₱1,040)");

  // Regular Holiday (200%): 8 hrs * 100 * 2.00 = ₱1,600
  const otHoliday = calculateOvertimePay(hourlyRate, 8, "regular_holiday");
  assert(otHoliday === 1600.0, "Regular Holiday is 200% (8 hrs @ ₱100/hr = ₱1,600)");
}

// ------------------------------------------------------------------------------
// Test 6: Full Payroll Item Computation for Monthly Salaried Employee
// ------------------------------------------------------------------------------
console.log("\nTEST GROUP 6: Full Monthly Salaried Employee Computation");
{
  const mockComp: EmployeeCompensation = {
    id: "comp-1",
    employee_id: "emp-1",
    branch_id: "branch-dvo",
    position: "Senior Aesthetic Nurse",
    employment_status: "active",
    employment_type: "regular",
    salary_type: "monthly",
    basic_salary: 24000.0, // ₱24,000 / month -> ₱12,000 / semi-monthly
    daily_rate: 923.08,
    hourly_rate: 115.38,
    payroll_frequency: "semi_monthly",
    effective_date: "2026-01-01",
    is_current: true,
    allowances: [{ id: "alw-1", name: "Rice Subsidy", amount: 2000, is_taxable: false, is_de_minimis: true }],
    commission_eligible: true,
    overtime_eligible: true,
    sss_enabled: true,
    philhealth_enabled: true,
    pagibig_enabled: true,
    pagibig_custom_amount: 200,
    tax_exempt: false,
    is_minimum_wage_earner: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    staff: { full_name: "Nurse Maria Santos", branches: { name: "Davao" }, roles: { name: "nurse" } },
  };

  const mockAtt: AttendanceRecord[] = [
    {
      id: "att-1",
      employee_id: "emp-1",
      branch_id: "branch-dvo",
      work_date: "2026-10-05",
      time_in: null,
      time_out: null,
      hours_worked: 8,
      late_minutes: 0,
      undertime_minutes: 0,
      status: "present",
      leave_type: null,
      is_approved_leave: false,
      overtime_hours: 4,
      overtime_type: "regular_workday",
      overtime_status: "approved",
      created_at: new Date().toISOString(),
    },
  ];

  const mockComm: CommissionRecord[] = [
    {
      id: "comm-1",
      employee_id: "emp-1",
      branch_id: "branch-dvo",
      source_type: "appointment",
      item_name: "IV Drip Infusion",
      base_amount: 3000,
      commission_rate: 10,
      is_percentage: true,
      commission_amount: 300,
      split_ratio: 1.0,
      date_earned: "2026-10-05",
      status: "approved",
      created_at: new Date().toISOString(),
    },
  ];

  const item = computeEmployeePayrollItem(mockComp, mockAtt, mockComm, {
    payrollRunId: "run-101",
    runNumber: "PR-202610-SM1",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-15",
    frequency: "semi_monthly",
    contributionSchedule: "split_50_50",
    cutoffIndex: 1,
  });

  // Verify basic pay: ₱24,000 / 2 = ₱12,000
  assert(item.basic_pay === 12000.0, "Basic pay is ₱12,000 for semi-monthly");

  // Verify OT pay: 4 hrs * 115.38 * 1.25 = ₱576.90
  assert(item.overtime_pay === 576.9, `Overtime pay is ₱576.90 (Got: ${item.overtime_pay})`);

  // Verify Commission pay: ₱300
  assert(item.commission_pay === 300.0, "Commission pay is ₱300.00");

  // Verify Allowance: ₱2,000 / 2 = ₱1,000
  assert(item.allowance_pay === 1000.0, "Allowance is ₱1,000.00 (half of monthly)");

  // Verify Gross Pay: 12,000 + 576.90 + 300 + 1,000 = ₱13,876.90
  assert(item.gross_pay === 13876.9, `Gross pay is ₱13,876.90 (Got: ${item.gross_pay})`);

  // Verify Net Pay = Gross - Total Deductions
  assert(item.net_pay === item.gross_pay - item.total_deductions, "Net Pay formula holds: Gross - Total Deductions");

  // Verify Employer contributions not deducted from Net Pay
  assert(item.total_employer_cost > item.gross_pay, "Employer contributions added to Employer Cost, not deducted from Net");
}

// ------------------------------------------------------------------------------
// Test 7: Daily-Paid & Hourly-Paid Calculations
// ------------------------------------------------------------------------------
console.log("\nTEST GROUP 7: Daily and Hourly Paid Calculations");
{
  const dailyComp: EmployeeCompensation = {
    id: "comp-2",
    employee_id: "emp-2",
    branch_id: "branch-dvo",
    position: "Therapist Trainee",
    employment_status: "active",
    employment_type: "probationary",
    salary_type: "daily",
    basic_salary: 0,
    daily_rate: 610.0,
    hourly_rate: 76.25,
    payroll_frequency: "semi_monthly",
    effective_date: "2026-01-01",
    is_current: true,
    allowances: [],
    commission_eligible: false,
    overtime_eligible: true,
    sss_enabled: true,
    philhealth_enabled: true,
    pagibig_enabled: true,
    pagibig_custom_amount: 200,
    tax_exempt: true,
    is_minimum_wage_earner: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const att: AttendanceRecord[] = [
    {
      id: "a1",
      employee_id: "emp-2",
      branch_id: "branch-dvo",
      work_date: "2026-10-01",
      time_in: null,
      time_out: null,
      hours_worked: 8,
      late_minutes: 0,
      undertime_minutes: 0,
      status: "present",
      leave_type: null,
      is_approved_leave: false,
      overtime_hours: 0,
      overtime_type: "regular_workday",
      overtime_status: "none",
      created_at: new Date().toISOString(),
    },
    {
      id: "a2",
      employee_id: "emp-2",
      branch_id: "branch-dvo",
      work_date: "2026-10-02",
      time_in: null,
      time_out: null,
      hours_worked: 8,
      late_minutes: 0,
      undertime_minutes: 0,
      status: "present",
      leave_type: null,
      is_approved_leave: false,
      overtime_hours: 0,
      overtime_type: "regular_workday",
      overtime_status: "none",
      created_at: new Date().toISOString(),
    },
  ];

  const item = computeEmployeePayrollItem(dailyComp, att, [], {
    payrollRunId: "run-102",
    runNumber: "PR-202610-SM1",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-15",
    frequency: "semi_monthly",
  });

  // 2 days worked * ₱610 = ₱1,220
  assert(item.basic_pay === 1220.0, "Daily basic pay is exactly days_worked * daily_rate (2 * 610 = ₱1,220)");
}

// ------------------------------------------------------------------------------
// Test 8: 13th-Month Pay Calculation (P.D. 851)
// ------------------------------------------------------------------------------
console.log("\nTEST GROUP 8: 13th-Month Pay Calculation (P.D. 851)");
{
  // ₱25,000 monthly salary * 12 months = ₱300,000 / 12 = ₱25,000
  const thFull = calculate13thMonthPay(300000, 12);
  assert(thFull === 25000.0, "13th-month pay for full 12 months is ₱25,000.00");

  // Prorated for 6 months (₱25,000 * 6 = ₱150,000 / 12 = ₱12,500)
  const thProrated = calculate13thMonthPay(150000, 6);
  assert(thProrated === 12500.0, "13th-month pay for 6 months prorated is ₱12,500.00");
}

console.log("\n=======================================================");
console.log(`QA TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
