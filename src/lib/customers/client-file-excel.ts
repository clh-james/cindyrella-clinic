// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Excel Multi-Sheet Workbook Generator for Complete Client File (15 Worksheets)
// ==============================================================================

import * as XLSX from "xlsx";
import type { CompleteClientFile } from "@/app/admin/(dashboard)/customers/types";

/**
 * Generates a structured 15-worksheet Excel workbook containing the client's complete records.
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
  // SHEET 2: Account Summary
  // ----------------------------------------------------------------------------
  const summaryRows = [
    { Metric: "Total Contract Value", "Amount (₱)": summary.total_contract_value, Basis: "Installment Contracts + Valid Retail POS Sales" },
    { Metric: "Total POS Sales", "Amount (₱)": summary.total_pos_sales, Basis: "Gross Retail Merchandise Sales" },
    { Metric: "Total Installment Contract Value", "Amount (₱)": summary.total_installment_contract_value, Basis: "All Authorized Client Installment Agreements" },
    { Metric: "Total Valid Collections", "Amount (₱)": summary.total_valid_payments, Basis: "Excludes Reversed, Refunded, or Voided Payments" },
    { Metric: "Total Refunds Processed", "Amount (₱)": summary.total_refunds, Basis: "Refunds on Treatments and Retails" },
    { Metric: "Total Reversed / Voided Transactions", "Amount (₱)": summary.total_refunded_reversed, Basis: "Reversals, Cashier Voids, and Cancelled Payments" },
    { Metric: "Outstanding Installment Balance", "Amount (₱)": summary.total_outstanding_balance, Basis: "Contract Total less Valid Collections" },
    { Metric: "Overdue Balance", "Amount (₱)": summary.overdue_balance, Basis: "Scheduled Installments Past Due Date" },
    { Metric: "Next Due Date", "Amount (₱)": summary.next_due_date || "None", Basis: "Earliest Upcoming Unpaid Installment" },
    { Metric: "Next Scheduled Amount", "Amount (₱)": summary.next_scheduled_amount || 0, Basis: "Scheduled Balance Due" },
    { Metric: "Number of Paid Installments", "Amount (₱)": summary.paid_installments_count, Basis: "Fully Settled Scheduled Installments" },
    { Metric: "Number of Remaining Installments", "Amount (₱)": summary.remaining_installments_count, Basis: "Unpaid or Partially Settled Installments" },
    { Metric: "Active Installment Contracts", "Amount (₱)": summary.active_applications_count, Basis: "Active Ongoing Financing Plans" },
    { Metric: "Number of POS Transactions", "Amount (₱)": summary.pos_transactions_count, Basis: "Total Client Retail Purchases" },
    { Metric: "Number of Appointments", "Amount (₱)": summary.appointments_count, Basis: "All Clinic Bookings Recorded" },
    { Metric: "Number of Completed Treatments", "Amount (₱)": summary.completed_treatments_count, Basis: "Treatments Rendered & Signed Off" },
    { Metric: "Active Packages or Memberships", "Amount (₱)": summary.active_packages_count, Basis: "Prepaid Service Packages with Remaining Sessions" },
    { Metric: "Last Clinic Visit", "Amount (₱)": summary.last_visit_date || "N/A", Basis: "Most Recent Completed Treatment or Transaction" },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Account Summary");

  // ----------------------------------------------------------------------------
  // SHEET 3: Installment Applications
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
  // SHEET 4: Installment Schedules
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
  // SHEET 5: Payment History
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
  // SHEET 6: POS Transactions
  // ----------------------------------------------------------------------------
  const posTxnRows =
    fileData.posTransactions && fileData.posTransactions.length > 0
      ? fileData.posTransactions.map((tx) => ({
          "Transaction Ref": tx.reference_number,
          "Receipt Number": tx.receipt_number || tx.reference_number,
          "Date & Time": new Date(tx.transaction_date || tx.created_at || new Date().toISOString()).toLocaleString("en-PH"),
          Branch: tx.branch_name,
          Cashier: tx.cashier_name || "Assigned Cashier",
          "Gross Amount (₱)": tx.total_amount,
          "Discount (₱)": tx.discount_amount || 0,
          "Discount Reason": tx.discount_reason || "None",
          "Net Paid (₱)": tx.total_amount - (tx.discount_amount || 0),
          "Payment Method": tx.payment_method.toUpperCase(),
          Status: tx.status.toUpperCase(),
          "Refunded Amount (₱)": tx.refunded_amount || 0,
          "Void Reason": tx.void_reason || "N/A",
        }))
      : [{ Note: "No retail POS transactions found for this client." }];
  const wsPOSTxns = XLSX.utils.json_to_sheet(posTxnRows);
  XLSX.utils.book_append_sheet(wb, wsPOSTxns, "POS Transactions");

  // ----------------------------------------------------------------------------
  // SHEET 7: POS Transaction Items
  // ----------------------------------------------------------------------------
  const posItemRows =
    fileData.posItems && fileData.posItems.length > 0
      ? fileData.posItems.map((item) => ({
          "Sale Reference": item.sale_reference,
          Date: new Date(item.date).toLocaleDateString("en-PH"),
          Branch: item.branch_name,
          "Item / Product Name": item.item_name,
          SKU: item.sku || "N/A",
          Quantity: item.quantity,
          "Price per Unit (₱)": item.price_per_unit,
          "Subtotal (₱)": item.subtotal,
        }))
      : [{ Note: "No line items found for client retail transactions." }];
  const wsPOSItems = XLSX.utils.json_to_sheet(posItemRows);
  XLSX.utils.book_append_sheet(wb, wsPOSItems, "POS Transaction Items");

  // ----------------------------------------------------------------------------
  // SHEET 8: Appointments
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
          "Payment Method": (a.payment_method || "N/A").toUpperCase(),
          "Payment Status": (a.payment_status || "UNPAID").toUpperCase(),
          "Booking Status": (a.status || "BOOKED").toUpperCase(),
          Notes: a.notes || "N/A",
        }))
      : [{ Note: "No appointments found for this client." }];
  const wsAppt = XLSX.utils.json_to_sheet(apptRows);
  XLSX.utils.book_append_sheet(wb, wsAppt, "Appointments");

  // ----------------------------------------------------------------------------
  // SHEET 9: Treatments and Services
  // ----------------------------------------------------------------------------
  const treatmentRows =
    fileData.appointments.length > 0
      ? fileData.appointments.map((a) => ({
          "Treatment Name": a.treatment_name,
          "Date Rendered": a.appointment_date,
          "Time Slot": a.appointment_time,
          Branch: a.branch_name,
          "Completion Status": a.status === "completed" ? "Completed" : (a.status || "BOOKED").toUpperCase(),
          "Payment Settled": a.payment_status === "paid" ? "PAID" : (a.payment_status || "UNPAID").toUpperCase(),
          "Amount Charged (₱)": a.amount_due,
          "Service Notes": a.notes || "None",
        }))
      : [{ Note: "No treatments or clinical services rendered." }];
  const wsTreatments = XLSX.utils.json_to_sheet(treatmentRows);
  XLSX.utils.book_append_sheet(wb, wsTreatments, "Treatments and Services");

  // ----------------------------------------------------------------------------
  // SHEET 10: Packages and Memberships
  // ----------------------------------------------------------------------------
  const pkgRows =
    fileData.packages.length > 0
      ? fileData.packages.map((pkg) => ({
          "Package Name": pkg.package_name,
          Branch: pkg.branch_name || "Main Clinic",
          "Total Sessions": pkg.total_sessions,
          "Sessions Remaining": pkg.sessions_remaining,
          "Sessions Redeemed": Math.max(0, pkg.total_sessions - pkg.sessions_remaining),
          "Price Paid (₱)": pkg.price_paid,
          "Start Date": pkg.start_date || (pkg.created_at ? pkg.created_at.slice(0, 10) : "N/A"),
          "Expiry Date": pkg.expiry_date || pkg.expires_at || "No Expiry",
          Status: (pkg.status || "ACTIVE").toUpperCase(),
          Notes: pkg.notes || "N/A",
        }))
      : [{ Note: "No packages or memberships found for this client." }];
  const wsPkg = XLSX.utils.json_to_sheet(pkgRows);
  XLSX.utils.book_append_sheet(wb, wsPkg, "Packages and Memberships");

  // ----------------------------------------------------------------------------
  // SHEET 11: Package Redemptions
  // ----------------------------------------------------------------------------
  const redemptionRows =
    fileData.packageRedemptions && fileData.packageRedemptions.length > 0
      ? fileData.packageRedemptions.map((red) => ({
          "Package Name": red.package_name,
          "Appointment Ref": red.appointment_reference,
          "Treatment Rendered": red.treatment_name,
          "Redemption Date": red.date,
          Branch: red.branch_name,
          "Sessions Deducted": red.sessions_deducted,
        }))
      : [{ Note: "No package session redemptions recorded." }];
  const wsRedemptions = XLSX.utils.json_to_sheet(redemptionRows);
  XLSX.utils.book_append_sheet(wb, wsRedemptions, "Package Redemptions");

  // ----------------------------------------------------------------------------
  // SHEET 12: Refunds and Adjustments
  // ----------------------------------------------------------------------------
  const refundRows =
    fileData.refundsAdjustments && fileData.refundsAdjustments.length > 0
      ? fileData.refundsAdjustments.map((r) => ({
          "Adjustment Ref": r.reference_number,
          "Original Ref": r.original_reference,
          Date: new Date(r.date).toLocaleString("en-PH"),
          Branch: r.branch_name,
          "Adjustment Type": (r.adjustment_type || "ADJUSTMENT").toUpperCase(),
          "Original Amount (₱)": r.original_amount,
          "Adjustment Amount (₱)": r.adjustment_amount,
          Reason: r.reason,
          "Approval Status": (r.approval_status || "COMPLETED").toUpperCase(),
          "Processed By": r.processed_by || "Authorized Supervisor",
        }))
      : [{ Note: "No refunds, adjustments, or payment reversals recorded." }];
  const wsRefunds = XLSX.utils.json_to_sheet(refundRows);
  XLSX.utils.book_append_sheet(wb, wsRefunds, "Refunds and Adjustments");

  // ----------------------------------------------------------------------------
  // SHEET 13: Receipts and Documents Index
  // ----------------------------------------------------------------------------
  const receiptRows =
    fileData.receipts && fileData.receipts.length > 0
      ? fileData.receipts.map((rcpt) => ({
          "Receipt / Document #": rcpt.receipt_number,
          "Document Type": rcpt.document_type,
          "Related Reference": rcpt.related_reference,
          Date: new Date(rcpt.date).toLocaleDateString("en-PH"),
          Branch: rcpt.branch_name,
          "Amount (₱)": rcpt.amount,
          "Document Status": rcpt.availability || "available",
          "Verification URL": rcpt.file_path || "In-Clinic Official Document",
        }))
      : [{ Note: "No formal receipt documents indexed." }];
  const wsReceipts = XLSX.utils.json_to_sheet(receiptRows);
  XLSX.utils.book_append_sheet(wb, wsReceipts, "Receipts and Documents Index");

  // ----------------------------------------------------------------------------
  // SHEET 14: Activity Timeline
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

  // ----------------------------------------------------------------------------
  // SHEET 15: Data Quality Warnings
  // ----------------------------------------------------------------------------
  const warningRows =
    fileData.warnings && fileData.warnings.length > 0
      ? fileData.warnings.map((w) => ({
          "Issue Type": w.issue_type,
          Description: w.description,
          Severity: w.severity.toUpperCase(),
          "Recommended Action": w.recommended_action,
        }))
      : [{ Note: "No data quality warnings or relationship discrepancies detected." }];
  const wsWarnings = XLSX.utils.json_to_sheet(warningRows);
  XLSX.utils.book_append_sheet(wb, wsWarnings, "Data Quality Warnings");

  // Write out as Excel binary array
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
