// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Philippine Statutory Calculation Engine & Tax Compliance (2025/2026)
// SSS, PhilHealth, Pag-IBIG (HDMF), TRAIN Law BIR Withholding Tax,
// DOLE Overtime & Holiday Multipliers, and 13th Month Pay
// ==============================================================================

export type OvertimeType =
  | "regular_workday"
  | "rest_day"
  | "rest_day_ot"
  | "special_holiday"
  | "special_holiday_ot"
  | "regular_holiday"
  | "regular_holiday_ot"
  | "rest_day_special_holiday"
  | "rest_day_regular_holiday"
  | "night_diff";

export interface SSSResult {
  monthlySalaryCredit: number;
  employeeShare: number;
  employerShare: number;
  ecShare: number;
  totalContribution: number;
}

export interface PhilHealthResult {
  monthlySalaryBasis: number;
  employeeShare: number;
  employerShare: number;
  totalPremium: number;
}

export interface PagIbigResult {
  employeeShare: number;
  employerShare: number;
  totalContribution: number;
}

export interface WithholdingTaxResult {
  taxableIncome: number;
  taxAmount: number;
  bracketDescription: string;
}

// ------------------------------------------------------------------------------
// 1. SSS CONTRIBUTION TABLE (2025-2026 OFFICIAL SCHEDULE)
// 14% Total: 5.0% Employee, 9.5% Employer + Employees' Compensation (EC)
// Minimum MSC: ₱5,000 | Maximum MSC: ₱35,000 (steps of ₱500)
// ------------------------------------------------------------------------------
export function calculateSSS(monthlyBasicSalary: number): SSSResult {
  if (monthlyBasicSalary <= 0) {
    return {
      monthlySalaryCredit: 0,
      employeeShare: 0,
      employerShare: 0,
      ecShare: 0,
      totalContribution: 0,
    };
  }

  // Determine Monthly Salary Credit (MSC)
  let msc = 5000;
  if (monthlyBasicSalary <= 5249.99) {
    msc = 5000;
  } else if (monthlyBasicSalary >= 34750) {
    msc = 35000;
  } else {
    // 500 increments: e.g. 5,250 - 5,749.99 -> 5,500
    const step = Math.floor((monthlyBasicSalary - 5250) / 500) + 1;
    msc = 5000 + step * 500;
    if (msc > 35000) msc = 35000;
  }

  const employeeShare = Math.round(msc * 0.05 * 100) / 100; // 5%
  const baseEmployerShare = Math.round(msc * 0.095 * 100) / 100; // 9.5%
  // EC is ₱10 for MSC < 15,000, ₱30 for MSC >= 15,000
  const ecShare = msc >= 15000 ? 30 : 10;
  const employerShare = baseEmployerShare + ecShare;
  const totalContribution = employeeShare + employerShare;

  return {
    monthlySalaryCredit: msc,
    employeeShare,
    employerShare,
    ecShare,
    totalContribution,
  };
}

// ------------------------------------------------------------------------------
// 2. PHILHEALTH CONTRIBUTION (2025-2026 OFFICIAL 5% PREMIUM RATE)
// 5.0% total: 2.5% Employee share, 2.5% Employer share
// Salary Floor: ₱10,000 | Salary Ceiling: ₱100,000
// ------------------------------------------------------------------------------
export function calculatePhilHealth(monthlyBasicSalary: number): PhilHealthResult {
  if (monthlyBasicSalary <= 0) {
    return {
      monthlySalaryBasis: 0,
      employeeShare: 0,
      employerShare: 0,
      totalPremium: 0,
    };
  }

  const salaryBasis = Math.min(100000, Math.max(10000, monthlyBasicSalary));
  const totalPremium = Math.round(salaryBasis * 0.05 * 100) / 100;
  const employeeShare = Math.round((totalPremium / 2) * 100) / 100;
  const employerShare = Math.round((totalPremium - employeeShare) * 100) / 100;

  return {
    monthlySalaryBasis: salaryBasis,
    employeeShare,
    employerShare,
    totalPremium,
  };
}

// ------------------------------------------------------------------------------
// 3. PAG-IBIG (HDMF) CONTRIBUTION (OFFICIAL SCHEDULE)
// 2% Employee (max ₱200), 2% Employer (max ₱200) for compensation >= ₱5,000
// Standard Total = ₱400 (Employee ₱200, Employer ₱200)
// Supports optional custom/upgraded savings amount
// ------------------------------------------------------------------------------
export function calculatePagIbig(
  monthlyBasicSalary: number,
  customEmployeeAmount?: number
): PagIbigResult {
  if (monthlyBasicSalary <= 0) {
    return { employeeShare: 0, employerShare: 0, totalContribution: 0 };
  }

  let employeeShare = 200.0;
  let employerShare = 200.0;

  if (monthlyBasicSalary < 1500) {
    // 1% employee, 2% employer
    employeeShare = Math.round(monthlyBasicSalary * 0.01 * 100) / 100;
    employerShare = Math.round(monthlyBasicSalary * 0.02 * 100) / 100;
  } else if (monthlyBasicSalary < 5000) {
    // 2% employee, 2% employer
    employeeShare = Math.round(monthlyBasicSalary * 0.02 * 100) / 100;
    employerShare = Math.round(monthlyBasicSalary * 0.02 * 100) / 100;
  } else {
    // Standard capped at ₱200
    employeeShare = 200.0;
    employerShare = 200.0;
  }

  if (customEmployeeAmount && customEmployeeAmount > employeeShare) {
    employeeShare = customEmployeeAmount;
    // Employer mandatory match remains standard ₱200
  }

  return {
    employeeShare,
    employerShare,
    totalContribution: employeeShare + employerShare,
  };
}

// ------------------------------------------------------------------------------
// 4. BIR WITHHOLDING TAX (TRAIN LAW REVISED WITHHOLDING TAX TABLES)
// Taxable Net = Taxable Gross - (SSS EE + PhilHealth EE + Pag-IBIG EE + Non-taxable de minimis)
// ------------------------------------------------------------------------------
export function calculateWithholdingTax(
  taxableNetIncome: number,
  frequency: "semi_monthly" | "monthly" | "weekly" = "semi_monthly",
  isMinimumWageEarner: boolean = false
): WithholdingTaxResult {
  if (isMinimumWageEarner || taxableNetIncome <= 0) {
    return {
      taxableIncome: Math.max(0, taxableNetIncome),
      taxAmount: 0.0,
      bracketDescription: isMinimumWageEarner
        ? "Exempt (Minimum Wage Earner)"
        : "Exempt (Income below threshold)",
    };
  }

  let tax = 0.0;
  let description = "Exempt";

  if (frequency === "semi_monthly") {
    if (taxableNetIncome <= 10417) {
      tax = 0.0;
      description = "Bracket 1: Up to ₱10,417 (0%)";
    } else if (taxableNetIncome <= 16666) {
      tax = (taxableNetIncome - 10417) * 0.15;
      description = "Bracket 2: 15% in excess over ₱10,417";
    } else if (taxableNetIncome <= 33332) {
      tax = 937.5 + (taxableNetIncome - 16667) * 0.2;
      description = "Bracket 3: ₱937.50 + 20% in excess over ₱16,667";
    } else if (taxableNetIncome <= 83332) {
      tax = 4270.7 + (taxableNetIncome - 33333) * 0.25;
      description = "Bracket 4: ₱4,270.70 + 25% in excess over ₱33,333";
    } else if (taxableNetIncome <= 333332) {
      tax = 16770.7 + (taxableNetIncome - 83333) * 0.3;
      description = "Bracket 5: ₱16,770.70 + 30% in excess over ₱83,333";
    } else {
      tax = 91770.7 + (taxableNetIncome - 333332) * 0.35;
      description = "Bracket 6: ₱91,770.70 + 35% in excess over ₱333,332";
    }
  } else if (frequency === "monthly") {
    if (taxableNetIncome <= 20833) {
      tax = 0.0;
      description = "Bracket 1: Up to ₱20,833 (0%)";
    } else if (taxableNetIncome <= 33333) {
      tax = (taxableNetIncome - 20833) * 0.15;
      description = "Bracket 2: 15% in excess over ₱20,833";
    } else if (taxableNetIncome <= 66666) {
      tax = 1875.0 + (taxableNetIncome - 33333) * 0.2;
      description = "Bracket 3: ₱1,875.00 + 20% in excess over ₱33,333";
    } else if (taxableNetIncome <= 166666) {
      tax = 8541.67 + (taxableNetIncome - 66667) * 0.25;
      description = "Bracket 4: ₱8,541.67 + 25% in excess over ₱66,667";
    } else if (taxableNetIncome <= 666666) {
      tax = 33541.67 + (taxableNetIncome - 166667) * 0.3;
      description = "Bracket 5: ₱33,541.67 + 30% in excess over ₱166,667";
    } else {
      tax = 183541.67 + (taxableNetIncome - 666667) * 0.35;
      description = "Bracket 6: ₱183,541.67 + 35% in excess over ₱666,667";
    }
  } else {
    // Weekly fallback (approximate 1/4 of monthly)
    const monthlyEquivalent = taxableNetIncome * 4.33;
    const monthlyRes = calculateWithholdingTax(monthlyEquivalent, "monthly", isMinimumWageEarner);
    tax = monthlyRes.taxAmount / 4.33;
    description = `Weekly prorated: ${monthlyRes.bracketDescription}`;
  }

  return {
    taxableIncome: Math.round(taxableNetIncome * 100) / 100,
    taxAmount: Math.round(Math.max(0, tax) * 100) / 100,
    bracketDescription: description,
  };
}

// ------------------------------------------------------------------------------
// 5. PHILIPPINE OVERTIME & HOLIDAY RATES (DOLE HANDBOOK)
// ------------------------------------------------------------------------------
export const OVERTIME_MULTIPLIERS: Record<OvertimeType, number> = {
  regular_workday: 1.25, // 125% of hourly rate
  rest_day: 1.3, // 130%
  rest_day_ot: 1.69, // 130% * 1.30 = 169%
  special_holiday: 1.3, // 130%
  special_holiday_ot: 1.69, // 130% * 1.30 = 169%
  regular_holiday: 2.0, // 200%
  regular_holiday_ot: 2.6, // 200% * 1.30 = 260%
  rest_day_special_holiday: 1.5, // 150%
  rest_day_regular_holiday: 2.6, // 260%
  night_diff: 0.1, // 10% differential
};

export const OVERTIME_LABELS: Record<OvertimeType, string> = {
  regular_workday: "Regular Workday OT (125%)",
  rest_day: "Rest Day Duty (130%)",
  rest_day_ot: "Rest Day OT (169%)",
  special_holiday: "Special Holiday Duty (130%)",
  special_holiday_ot: "Special Holiday OT (169%)",
  regular_holiday: "Regular Holiday Duty (200%)",
  regular_holiday_ot: "Regular Holiday OT (260%)",
  rest_day_special_holiday: "Rest Day + Special Holiday (150%)",
  rest_day_regular_holiday: "Rest Day + Regular Holiday (260%)",
  night_diff: "Night Shift Differential (10%)",
};

export function calculateOvertimePay(
  hourlyRate: number,
  hours: number,
  type: OvertimeType
): number {
  if (hourlyRate <= 0 || hours <= 0) return 0.0;
  const multiplier = OVERTIME_MULTIPLIERS[type] || 1.25;
  return Math.round(hourlyRate * multiplier * hours * 100) / 100;
}

// ------------------------------------------------------------------------------
// 6. 13th-MONTH PAY (PRESIDENTIAL DECREE NO. 851)
// Formula: Total Basic Salary Earned in Calendar Year / 12 Months
// Excludes commissions, allowances, overtime, and discretionary bonuses
// ------------------------------------------------------------------------------
export function calculate13thMonthPay(
  totalBasicEarned: number,
  monthsWorked: number = 12
): number {
  if (totalBasicEarned <= 0 || monthsWorked <= 0) return 0.0;
  // If months worked < 12, prorated based on qualifying basic earnings / 12
  const pay = totalBasicEarned / 12;
  return Math.round(pay * 100) / 100;
}

// ------------------------------------------------------------------------------
// 7. FORMATTERS & CONVENIENCE UTILITIES
// ------------------------------------------------------------------------------
export function formatPHP(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}
