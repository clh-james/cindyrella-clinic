// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Payroll Reports & Excel/CSV Exporter
// ==============================================================================

import * as XLSX from "xlsx";
import { PayrollItem, PayrollRun, CommissionRecord, AttendanceRecord, ThirteenthMonthRecord } from "@/app/admin/(dashboard)/payroll/types";

// 1. Export Full Payroll Register
export function exportPayrollRegisterExcel(run: PayrollRun, items: PayrollItem[]) {
  const wb = XLSX.utils.book_new();

  // Header info rows
  const headerInfo = [
    ["CINDYRELLA AESTHETIC & WELLNESS / CLINIC & SPA"],
    ["PAYROLL REGISTER REPORT"],
    [`Payroll Run #: ${run.run_number}`, `Period: ${run.period_start} to ${run.period_end}`, `Pay Date: ${run.pay_date}`],
    [`Branch: ${run.branch?.name || "All Branches"}`, `Status: ${run.status.toUpperCase()}`, `Generated: ${new Date().toLocaleString("en-PH")}`],
    [], // empty row
  ];

  // Table columns
  const tableData = items.map((item) => ({
    "Payslip #": item.payslip_number,
    "Employee Name": item.employee_name,
    "Position": item.position,
    "Branch": item.branch_name,
    "Salary Type": item.salary_type,
    "Days Worked": item.days_worked,
    "Hours Worked": item.hours_worked,
    "Basic Pay": item.basic_pay,
    "Overtime Pay": item.overtime_pay,
    "Commission": item.commission_pay,
    "Allowances": item.allowance_pay,
    "Gross Pay": item.gross_pay,
    "SSS (EE)": item.sss_employee,
    "PhilHealth (EE)": item.philhealth_employee,
    "Pag-IBIG (EE)": item.pagibig_employee,
    "Withholding Tax": item.withholding_tax,
    "Tardiness/Absences": item.late_undertime_deduction + item.absence_deduction,
    "Total Deductions": item.total_deductions,
    "Net Pay": item.net_pay,
    "SSS (ER)": item.sss_employer,
    "PhilHealth (ER)": item.philhealth_employer,
    "Pag-IBIG (ER)": item.pagibig_employer,
    "Total Employer Cost": item.total_employer_cost,
  }));

  const ws = XLSX.utils.aoa_to_sheet(headerInfo);
  XLSX.utils.sheet_add_json(ws, tableData, { origin: "A6" });

  // Add summary total row
  const totalGross = items.reduce((sum, i) => sum + i.gross_pay, 0);
  const totalDed = items.reduce((sum, i) => sum + i.total_deductions, 0);
  const totalNet = items.reduce((sum, i) => sum + i.net_pay, 0);
  const totalER = items.reduce((sum, i) => sum + i.total_employer_cost, 0);

  const summaryRow = [
    ["TOTALS:", "", "", "", "", "", "", "", "", "", "", totalGross, "", "", "", "", "", totalDed, totalNet, "", "", "", totalER]
  ];
  XLSX.utils.sheet_add_aoa(ws, summaryRow, { origin: -1 });

  XLSX.utils.book_append_sheet(wb, ws, "Payroll Register");
  const fileName = `Cindyrella_Payroll_Register_${run.run_number}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 2. Export Statutory Contributions Remittance Report (SSS, PhilHealth, Pag-IBIG)
export function exportStatutoryReportExcel(run: PayrollRun, items: PayrollItem[]) {
  const wb = XLSX.utils.book_new();

  const data = items.map((i) => ({
    "Employee Name": i.employee_name,
    "Position": i.position,
    "Branch": i.branch_name,
    "Gross Pay": i.gross_pay,
    "SSS Employee": i.sss_employee,
    "SSS Employer": i.sss_employer,
    "SSS Total": i.sss_employee + i.sss_employer,
    "PhilHealth Employee": i.philhealth_employee,
    "PhilHealth Employer": i.philhealth_employer,
    "PhilHealth Total": i.philhealth_employee + i.philhealth_employer,
    "Pag-IBIG Employee": i.pagibig_employee,
    "Pag-IBIG Employer": i.pagibig_employer,
    "Pag-IBIG Total": i.pagibig_employee + i.pagibig_employer,
    "Withholding Tax (BIR)": i.withholding_tax,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Government Remittance");
  XLSX.writeFile(wb, `Cindyrella_Statutory_Contributions_${run.run_number}.xlsx`);
}

// 3. Export Commissions Report
export function exportCommissionsExcel(commissions: CommissionRecord[]) {
  const wb = XLSX.utils.book_new();

  const data = commissions.map((c) => ({
    "Date": c.date_earned,
    "Staff Name": c.staff?.full_name || "Staff",
    "Source": c.source_type,
    "Item / Service": c.item_name,
    "Base Amount": c.base_amount,
    "Commission Rate": `${c.commission_rate}${c.is_percentage ? "%" : " PHP"}`,
    "Split Ratio": `${(c.split_ratio * 100).toFixed(0)}%`,
    "Commission Earned": c.commission_amount,
    "Status": c.status.toUpperCase(),
    "Notes": c.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Commissions");
  XLSX.writeFile(wb, `Cindyrella_Commissions_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 4. Export Overtime & Attendance Report
export function exportAttendanceReportExcel(records: AttendanceRecord[]) {
  const wb = XLSX.utils.book_new();

  const data = records.map((r) => ({
    "Date": r.work_date,
    "Employee": r.staff?.full_name || "Staff",
    "Status": r.status.toUpperCase(),
    "Hours Worked": r.hours_worked,
    "Late (Mins)": r.late_minutes,
    "Undertime (Mins)": r.undertime_minutes,
    "Overtime Hours": r.overtime_hours,
    "Overtime Type": r.overtime_type,
    "OT Approval Status": r.overtime_status.toUpperCase(),
    "Notes": r.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Attendance & Overtime");
  XLSX.writeFile(wb, `Cindyrella_Attendance_Overtime_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 5. Export 13th Month Pay Report
export function exportThirteenthMonthExcel(records: ThirteenthMonthRecord[], year: number) {
  const wb = XLSX.utils.book_new();

  const data = records.map((r) => ({
    "Year": r.year,
    "Employee": r.staff?.full_name || "Staff",
    "Branch": r.staff?.branches?.name || "Branch",
    "Months Worked": r.months_worked,
    "Total Basic Earned": r.total_basic_earned,
    "Computed 13th Month": r.thirteenth_month_pay,
    "Adjustments": r.adjustments,
    "Final Payout": r.final_payout,
    "Status": r.status.toUpperCase(),
    "Notes": r.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `13th Month ${year}`);
  XLSX.writeFile(wb, `Cindyrella_13th_Month_Pay_${year}.xlsx`);
}

// 6. Generic CSV Downloader
export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
