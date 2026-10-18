// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Excel Workbook Exporter for Complete Client Account History (9 Sheets)
// ==============================================================================

import * as XLSX from "xlsx";
import type { CompleteClientFile } from "@/app/admin/(dashboard)/customers/types";

/**
 * Generates an Excel workbook with 9 distinct, structured sheets for the client.
 */
export function generateClientFileExcel(fileData: CompleteClientFile): Blob {
  const wb = XLSX.utils.book_new();
  const client = fileData.client;
  const summary = fileData.summary;

  // ----------------------------------------------------------------------------
  // SHEET 1: Client Profile
  // ----------------------------------------------------------------------------
  const profileRows = [
    { Field: "Client Code / ID", Value: client.customer_code || client.id },
    { Field: "Full Name", Value: client.full_name || `${client.first_name} ${client.last_name}` },
    { Field: "Contact Phone", Value: client.phone },
    { Field: "Email Address", Value: client.email || "N/A" },
    { Field: "Complete Address", Value: client.address || "N/A" },
    { Field: "Birthday", Value: client.birthday || "N/A" },
    { Field: "Gender", Value: client.gender || "N/A" },
    { Field: "Account Status", Value: (client.account_status || "Active").toUpperCase() },
    { Field: "Assigned Branch", Value: client.branch_name || "Main Clinic" },
    { Field: "Loyalty Points", Value: client.loyalty_points || 0 },
    { Field: "Emergency Contact", Value: client.emergency_contact || "N/A" },
    { Field: "Medical Conditions", Value: client.medical_conditions || "None reported" },
    { Field: "Known Allergies", Value: client.allergies || "None reported" },
    { Field: "Registration Date", Value: new Date(client.created_at).toLocaleDateString("en-PH") },
    { Field: "Export Date & Time", Value: new Date(fileData.generated_at).toLocaleString("en-PH") },
    { Field: "Authorized Branch Scope", Value: fileData.branch_scope },
    { Field: "Exported By", Value: fileData.generated_by },
  ];
  const wsProfile = XLSX.utils.json_to_sheet(profileRows);
  XLSX.utils.book_append_sheet(wb, wsProfile, "Client Profile");

  // ----------------------------------------------------------------------------
  // SHEET 2: Installment Applications
  // ----------------------------------------------------------------------------
  const appRows =
    fileData.applications.length > 0
      ? fileData.applications.map((app) => ({
          "Application Ref": app.application_number,
          "Contract Date": app.contract_start_date,
          Branch: app.branch_name || "Main Clinic",
          "Service / Package": app.service_package_name,
          "Contract Value (₱)": app.original_contract_amount,
          "Down Payment Req (₱)": app.down_payment_required,
          "Down Payment Recv (₱)": app.down_payment_received,
          Frequency: app.frequency.toUpperCase(),
          "Installment Amount (₱)": app.installment_amount,
          "No. of Installments": app.number_of_installments,
          "Total Valid Paid (₱)": app.valid_payments_total || 0,
          "Outstanding Balance (₱)": app.outstanding_balance || 0,
          Status: app.status.toUpperCase(),
          "Approval Status": app.approval_status.toUpperCase(),
          "Approved By": app.approved_by_name || "N/A",
          Notes: app.notes || "None",
        }))
      : [{ Note: "No installment applications found for this client." }];
  const wsApps = XLSX.utils.json_to_sheet(appRows);
  XLSX.utils.book_append_sheet(wb, wsApps, "Installment Applications");

  // ----------------------------------------------------------------------------
  // SHEET 3: Installment Schedules
  // ----------------------------------------------------------------------------
  const schedRows =
    fileData.schedules.length > 0
      ? fileData.schedules.map((s) => ({
          "Installment #": s.installment_number,
          "Due Date": s.due_date,
          "Scheduled Amount (₱)": s.scheduled_amount,
          "Amount Paid (₱)": s.amount_paid,
          "Remaining Amount (₱)": s.remaining_amount,
          "Payment Date": s.payment_date || "Pending",
          Status: s.status.toUpperCase(),
          Notes: s.notes || "N/A",
        }))
      : [{ Note: "No scheduled installments found." }];
  const wsSched = XLSX.utils.json_to_sheet(schedRows);
  XLSX.utils.book_append_sheet(wb, wsSched, "Installment Schedules");

  // ----------------------------------------------------------------------------
  // SHEET 4: Payment History (All Valid & Historical Collections)
  // ----------------------------------------------------------------------------
  const payRows =
    fileData.payments.length > 0
      ? fileData.payments.map((p) => ({
          "Payment Date": new Date(p.payment_date).toLocaleString("en-PH"),
          "Payment Ref": p.payment_reference,
          "Txn Ref": p.transaction_reference || "N/A",
          "App Ref": p.application_reference || "N/A",
          "Installment #": p.installment_number !== null ? `#${p.installment_number}` : "N/A",
          "Amount Paid (₱)": p.amount_paid,
          "Payment Method": p.payment_method.toUpperCase(),
          Branch: p.branch_name,
          "Received By": p.received_by_name || "Cashier",
          "Shift Ref": p.shift_reference || "N/A",
          "Receipt / OR #": p.receipt_number || "N/A",
          Status: p.status.toUpperCase(),
          "Valid Collection": p.is_valid_collection ? "YES" : "NO (Reversed/Voided)",
          Notes: p.notes || "N/A",
        }))
      : [{ Note: "No payment history found." }];
  const wsPay = XLSX.utils.json_to_sheet(payRows);
  XLSX.utils.book_append_sheet(wb, wsPay, "Payment History");

  // ----------------------------------------------------------------------------
  // SHEET 5: Outstanding Balances & Financial Summary
  // ----------------------------------------------------------------------------
  const balanceRows = [
    { Metric: "Total Contract Value", "Amount (₱)": summary.total_contract_value },
    { Metric: "Total Valid Collections", "Amount (₱)": summary.total_valid_payments },
    { Metric: "Total Refunded / Reversed", "Amount (₱)": summary.total_refunded_reversed },
    { Metric: "Total Outstanding Balance", "Amount (₱)": summary.total_outstanding_balance },
    { Metric: "Overdue Balance", "Amount (₱)": summary.overdue_balance },
    { Metric: "Next Due Date", "Amount (₱)": summary.next_due_date || "None" },
    { Metric: "Next Scheduled Amount", "Amount (₱)": summary.next_scheduled_amount || 0 },
    { Metric: "Number of Paid Installments", "Amount (₱)": summary.paid_installments_count },
    { Metric: "Number of Remaining Installments", "Amount (₱)": summary.remaining_installments_count },
    { Metric: "Active Installment Contracts", "Amount (₱)": summary.active_applications_count },
  ];
  const wsBal = XLSX.utils.json_to_sheet(balanceRows);
  XLSX.utils.book_append_sheet(wb, wsBal, "Outstanding Balances");

  // ----------------------------------------------------------------------------
  // SHEET 6: Appointments and Services
  // ----------------------------------------------------------------------------
  const apptRows =
    fileData.appointments.length > 0
      ? fileData.appointments.map((a) => ({
          "Booking Ref": a.reference_number,
          Date: a.appointment_date,
          Time: a.appointment_time,
          Treatment: a.treatment_name,
          Branch: a.branch_name,
          "Amount Due (₱)": a.amount_due,
          "Payment Method": a.payment_method.toUpperCase(),
          "Payment Status": a.payment_status.toUpperCase(),
          "Booking Status": a.status.toUpperCase(),
          Notes: a.notes || "N/A",
        }))
      : [{ Note: "No appointments or clinic treatments found." }];
  const wsAppt = XLSX.utils.json_to_sheet(apptRows);
  XLSX.utils.book_append_sheet(wb, wsAppt, "Appointments and Services");

  // ----------------------------------------------------------------------------
  // SHEET 7: Packages and Memberships
  // ----------------------------------------------------------------------------
  const pkgRows =
    fileData.packages.length > 0
      ? fileData.packages.map((pkg) => ({
          "Package Name": pkg.package_name,
          Branch: pkg.branch_name || "Main Clinic",
          "Total Sessions": pkg.total_sessions,
          "Sessions Remaining": pkg.sessions_remaining,
          "Price Paid (₱)": pkg.price_paid,
          "Start Date": pkg.start_date,
          "Expiry Date": pkg.expiry_date || "No Expiry",
          Status: pkg.status.toUpperCase(),
          Notes: pkg.notes || "N/A",
        }))
      : [{ Note: "No packages or memberships found for this client." }];
  const wsPkg = XLSX.utils.json_to_sheet(pkgRows);
  XLSX.utils.book_append_sheet(wb, wsPkg, "Packages and Memberships");

  // ----------------------------------------------------------------------------
  // SHEET 8: Refunds and Adjustments
  // ----------------------------------------------------------------------------
  const refundItems = fileData.payments.filter(
    (p) => p.status === "reversed" || p.status === "refunded" || p.status === "voided"
  );
  const refundRows =
    refundItems.length > 0
      ? refundItems.map((r) => ({
          "Payment Ref": r.payment_reference,
          "Original Txn Ref": r.transaction_reference || "N/A",
          Date: new Date(r.payment_date).toLocaleString("en-PH"),
          "Reversed Amount (₱)": r.amount_paid,
          Method: r.payment_method.toUpperCase(),
          Status: r.status.toUpperCase(),
          Branch: r.branch_name,
          Reason: r.notes || "Authorized Reversal",
        }))
      : [{ Note: "No refunds, adjustments, or payment reversals recorded." }];
  const wsRefunds = XLSX.utils.json_to_sheet(refundRows);
  XLSX.utils.book_append_sheet(wb, wsRefunds, "Refunds and Adjustments");

  // ----------------------------------------------------------------------------
  // SHEET 9: Activity Timeline
  // ----------------------------------------------------------------------------
  const timelineRows =
    fileData.timeline.length > 0
      ? fileData.timeline.map((t) => ({
          "Date & Time": t.date_formatted,
          "Activity Type": t.type.replace(/_/g, " ").toUpperCase(),
          Title: t.title,
          Description: t.description,
          Reference: t.reference_number || "N/A",
          Branch: t.branch_name || "Main Clinic",
          "Amount (₱)": t.amount !== null && t.amount !== undefined ? t.amount : "",
          Status: (t.status || "").toUpperCase(),
          "Recorded By": t.actor_name || "System",
        }))
      : [{ Note: "No client timeline activity recorded." }];
  const wsTimeline = XLSX.utils.json_to_sheet(timelineRows);
  XLSX.utils.book_append_sheet(wb, wsTimeline, "Activity Timeline");

  // Write out as Excel binary array
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
