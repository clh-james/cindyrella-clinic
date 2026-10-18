// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Excel & CSV Attendance & Login Monitoring Export Utility
// ==============================================================================

import ExcelJS from "exceljs";
import {
  DailyAttendanceRecord,
  AttendanceCorrection,
  StaffLoginSessionRecord,
} from "@/app/admin/(dashboard)/attendance/types";

/**
 * Builds and downloads a professional Excel workbook for Daily Staff Attendance.
 */
export async function exportDailyAttendanceExcel(
  records: DailyAttendanceRecord[],
  reportDateStr: string = new Date().toISOString().split("T")[0],
  branchScope: string = "All Branches"
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cindyrella Aesthetic & Wellness Clinic";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Daily Attendance", {
    views: [{ state: "frozen", ySplit: 5 }],
  });

  // Title Block
  sheet.mergeCells("A1:K1");
  sheet.getCell("A1").value = "CINDYRELLA AESTHETIC & WELLNESS CLINIC";
  sheet.getCell("A1").font = { name: "Arial", size: 14, bold: true, color: { argb: "FF5C3B1E" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };

  sheet.mergeCells("A2:K2");
  sheet.getCell("A2").value = `DAILY STAFF ATTENDANCE LEDGER — ${reportDateStr} (${branchScope})`;
  sheet.getCell("A2").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF333333" } };

  sheet.mergeCells("A3:K3");
  sheet.getCell("A3").value = `Generated on: ${new Date().toLocaleString("en-PH")} | Scope: ${branchScope}`;
  sheet.getCell("A3").font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };

  // Headers (Row 5)
  const headers = [
    "Employee ID",
    "Employee Name",
    "Branch",
    "Scheduled Shift",
    "Time In",
    "Break Minutes",
    "Time Out",
    "Recorded Hours",
    "Late (Mins)",
    "Undertime (Mins)",
    "Status",
  ];

  const headerRow = sheet.getRow(5);
  headerRow.values = headers;
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF5C3B1E" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Data rows
  records.forEach((r, idx) => {
    const row = sheet.addRow([
      r.employee_code || r.employee_id.slice(0, 8),
      r.employee_name,
      r.branch_name,
      `${r.shift_name} (${r.scheduled_start_time.slice(0, 5)} - ${r.scheduled_end_time.slice(0, 5)})`,
      r.time_in ? new Date(r.time_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--",
      r.break_minutes || 0,
      r.time_out ? new Date(r.time_out).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--",
      Number(r.hours_worked || 0).toFixed(2),
      r.late_minutes || 0,
      r.undertime_minutes || 0,
      r.attendance_status.toUpperCase().replace(/_/g, " "),
    ]);

    row.font = { name: "Arial", size: 9 };
    row.height = 20;

    // Zebra striping
    if (idx % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFDFBF7" },
      };
    }

    // Number formats
    row.getCell(8).numFmt = "0.00";
    row.getCell(9).numFmt = "#,##0";
    row.getCell(10).numFmt = "#,##0";
  });

  // Enable Auto-filter
  sheet.autoFilter = {
    from: "A5",
    to: `K${records.length + 5}`,
  };

  // Auto-fit column widths
  sheet.columns.forEach((col) => {
    let maxLen = 14;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : "";
      if (val.length > maxLen) maxLen = Math.min(val.length + 3, 35);
    });
    col.width = maxLen;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Builds and downloads a professional Excel workbook for Staff Login Activity.
 */
export async function exportStaffLoginActivityExcel(
  sessions: StaffLoginSessionRecord[],
  branchScope: string = "All Branches"
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cindyrella Aesthetic & Wellness Clinic";

  const sheet = workbook.addWorksheet("Login Activity", {
    views: [{ state: "frozen", ySplit: 5 }],
  });

  // Title Block
  sheet.mergeCells("A1:J1");
  sheet.getCell("A1").value = "CINDYRELLA AESTHETIC & WELLNESS CLINIC";
  sheet.getCell("A1").font = { name: "Arial", size: 14, bold: true, color: { argb: "FF5C3B1E" } };

  sheet.mergeCells("A2:J2");
  sheet.getCell("A2").value = `STAFF SYSTEM LOGIN & AUTHENTICATION AUDIT REPORT (${branchScope})`;
  sheet.getCell("A2").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF333333" } };

  sheet.mergeCells("A3:J3");
  sheet.getCell("A3").value = `Generated on: ${new Date().toLocaleString("en-PH")} | Scope: ${branchScope}`;
  sheet.getCell("A3").font = { name: "Arial", size: 9, italic: true, color: { argb: "FF666666" } };

  const headers = [
    "Staff Member",
    "Branch Context",
    "Login Timestamp",
    "Logout Timestamp",
    "Duration (Mins)",
    "Session Status",
    "Logout / Termination Reason",
    "IP Address",
    "Device / OS",
    "Browser",
  ];

  const headerRow = sheet.getRow(5);
  headerRow.values = headers;
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }, // Navy blue for security audit
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  sessions.forEach((s, idx) => {
    const durationMins = s.duration_seconds ? Math.round(s.duration_seconds / 60) : 0;
    const row = sheet.addRow([
      s.employee_name,
      s.branch_name,
      new Date(s.login_at).toLocaleString("en-PH"),
      s.logout_at ? new Date(s.logout_at).toLocaleString("en-PH") : "Active / Unknown End",
      durationMins > 0 ? durationMins : "--",
      s.status,
      s.logout_reason || (s.status === "ACTIVE" ? "Active Session" : "--"),
      s.ip_address || "Internal / Local",
      `${s.device_type || "Desktop"} (${s.operating_system || "Unknown OS"})`,
      s.browser || "Unknown Browser",
    ]);

    row.font = { name: "Arial", size: 9 };
    row.height = 20;

    if (idx % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      };
    }
  });

  sheet.autoFilter = {
    from: "A5",
    to: `J${sessions.length + 5}`,
  };

  sheet.columns.forEach((col) => {
    let maxLen = 15;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : "";
      if (val.length > maxLen) maxLen = Math.min(val.length + 3, 35);
    });
    col.width = maxLen;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Generates CSV string for daily attendance.
 */
export function generateDailyAttendanceCSV(records: DailyAttendanceRecord[]): string {
  const headers = [
    "Employee Code",
    "Employee Name",
    "Branch",
    "Shift",
    "Scheduled Start",
    "Scheduled End",
    "Time In",
    "Time Out",
    "Hours Worked",
    "Late Minutes",
    "Undertime Minutes",
    "Status",
  ];

  const rows = records.map((r) => [
    `"${r.employee_code || r.employee_id.slice(0, 8)}"`,
    `"${r.employee_name.replace(/"/g, '""')}"`,
    `"${r.branch_name}"`,
    `"${r.shift_name}"`,
    `"${r.scheduled_start_time}"`,
    `"${r.scheduled_end_time}"`,
    `"${r.time_in ? new Date(r.time_in).toLocaleString("en-PH") : ""}"`,
    `"${r.time_out ? new Date(r.time_out).toLocaleString("en-PH") : ""}"`,
    r.hours_worked,
    r.late_minutes,
    r.undertime_minutes,
    `"${r.attendance_status}"`,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}
