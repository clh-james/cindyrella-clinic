// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// High-Fidelity Printable PDF / HTML Template for Complete Client File
// ==============================================================================

import type { CompleteClientFile } from "@/app/admin/(dashboard)/customers/types";
import { formatPHP } from "./customer-history-engine";

/**
 * Generates print-ready HTML document for the client statement & account history.
 */
export function generateClientFilePrintableHTML(fileData: CompleteClientFile): string {
  const client = fileData.client;
  const summary = fileData.summary;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Client File — ${client.full_name || client.first_name} (${client.customer_code || client.id})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 12mm 15mm 12mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #718096;
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
      color: #1a202c;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    .header-table {
      width: 100%;
      border-bottom: 2px solid #800020;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .brand-title {
      font-size: 15pt;
      font-weight: 700;
      color: #800020;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .brand-subtitle {
      font-size: 8.5pt;
      color: #718096;
      margin-top: 2px;
    }

    .doc-badge {
      text-align: right;
    }

    .doc-badge-title {
      font-size: 11pt;
      font-weight: 700;
      color: #2d3748;
      text-transform: uppercase;
    }

    .doc-meta {
      font-size: 8pt;
      color: #718096;
      margin-top: 2px;
    }

    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #800020;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .profile-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }

    .profile-grid td {
      padding: 4px 6px;
      vertical-align: top;
      font-size: 8.5pt;
    }

    .profile-label {
      width: 18%;
      color: #718096;
      font-weight: 600;
    }

    .profile-value {
      width: 32%;
      color: #1a202c;
    }

    .summary-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }

    .summary-card-td {
      padding: 6px;
      width: 25%;
    }

    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }

    .summary-card-label {
      font-size: 7.5pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .summary-card-val {
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 3px;
    }

    .summary-card-highlight {
      border-color: #fecdd3;
      background: #fff1f2;
    }
    .summary-card-highlight .summary-card-val {
      color: #9f1239;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      page-break-inside: auto;
    }

    table.data-table thead {
      display: table-header-group;
    }

    table.data-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    table.data-table th {
      background-color: #edf2f7;
      color: #2d3748;
      font-size: 7.5pt;
      font-weight: 600;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #cbd5e0;
      text-transform: uppercase;
    }

    table.data-table td {
      font-size: 8pt;
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      color: #2d3748;
    }

    table.data-table tr:nth-child(even) td {
      background-color: #f7fafc;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-paid, .status-active, .status-completed {
      background: #c6f6d5;
      color: #22543d;
    }

    .status-overdue, .status-defaulted, .status-reversed, .status-voided {
      background: #fed7d7;
      color: #742a2a;
    }

    .status-upcoming, .status-pending {
      background: #feebc8;
      color: #7b341e;
    }

    .empty-note {
      padding: 10px;
      text-align: center;
      color: #718096;
      font-style: italic;
      font-size: 8pt;
      border: 1px dashed #cbd5e0;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .footer-stamp {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e0;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #718096;
      page-break-inside: avoid;
    }

    .sign-block {
      width: 220px;
      text-align: center;
      border-top: 1px solid #4a5568;
      padding-top: 4px;
      margin-top: 40px;
      font-size: 8pt;
      color: #2d3748;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar for Screen view -->
  <div class="no-print" style="background: #2d3748; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
    <div>
      <span style="font-weight: 600;">Cindyrella Client File Viewer</span> &mdash; ${client.full_name || client.first_name} (${client.customer_code || client.id})
    </div>
    <div>
      <button onclick="window.print()" style="background: #800020; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: 600; margin-right: 8px;">Print / Save to PDF</button>
      <button onclick="window.close()" style="background: #4a5568; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Close</button>
    </div>
  </div>

  <!-- CLINIC HEADER -->
  <table class="header-table">
    <tr>
      <td>
        <div class="brand-title">CINDYRELLA AESTHETIC &amp; WELLNESS</div>
        <div class="brand-subtitle">Clinic &amp; Spa Management System &bull; Davao &bull; Makati &bull; Cebu</div>
      </td>
      <td class="doc-badge">
        <div class="doc-badge-title">COMPLETE CLIENT FILE AND ACCOUNT HISTORY</div>
        <div style="font-size: 8pt; color: #800020; font-weight: 600;">COMPLETE CLIENT ACCOUNT HISTORY</div>
        <div class="doc-meta">Generated: ${new Date(fileData.generated_at).toLocaleString("en-PH")}</div>
        <div class="doc-meta">Authorized Scope: ${fileData.branch_scope}</div>
      </td>
    </tr>
  </table>

  <!-- SECTION A: CLIENT INFORMATION -->
  <div class="section-title">SECTION A &mdash; Client Profile</div>
  <table class="profile-grid">
    <tr>
      <td class="profile-label">Client Code / ID:</td>
      <td class="profile-value"><strong>${client.customer_code || client.id}</strong></td>
      <td class="profile-label">Assigned Branch:</td>
      <td class="profile-value">${client.branch_name || "Main Clinic"}</td>
    </tr>
    <tr>
      <td class="profile-label">Full Name:</td>
      <td class="profile-value">${client.full_name || `${client.first_name} ${client.last_name}`}</td>
      <td class="profile-label">Account Status:</td>
      <td class="profile-value"><span class="status-badge status-active">${(client.account_status || "Active").toUpperCase()}</span></td>
    </tr>
    <tr>
      <td class="profile-label">Phone Number:</td>
      <td class="profile-value">${client.phone}</td>
      <td class="profile-label">Registration Date:</td>
      <td class="profile-value">${new Date(client.created_at).toLocaleDateString("en-PH")}</td>
    </tr>
    <tr>
      <td class="profile-label">Email Address:</td>
      <td class="profile-value">${client.email || "N/A"}</td>
      <td class="profile-label">Loyalty Points:</td>
      <td class="profile-value">${client.loyalty_points || 0} pts</td>
    </tr>
    <tr>
      <td class="profile-label">Complete Address:</td>
      <td class="profile-value">${client.address || "N/A"}</td>
      <td class="profile-label">Emergency Contact:</td>
      <td class="profile-value">${client.emergency_contact || "N/A"}</td>
    </tr>
    <tr>
      <td class="profile-label">Medical Conditions:</td>
      <td class="profile-value">${client.medical_conditions || "None reported"}</td>
      <td class="profile-label">Known Allergies:</td>
      <td class="profile-value">${client.allergies || "None reported"}</td>
    </tr>
  </table>

  <!-- SECTION B: ACCOUNT SUMMARY & BALANCES -->
  <div class="section-title">SECTION B &mdash; Account Summary &amp; Balances</div>
  <table class="summary-grid">
    <tr>
      <td class="summary-card-td">
        <div class="summary-card">
          <div class="summary-card-label">Total Contract Value</div>
          <div class="summary-card-val">${formatPHP(summary.total_contract_value)}</div>
        </div>
      </td>
      <td class="summary-card-td">
        <div class="summary-card">
          <div class="summary-card-label">Total Valid Collections</div>
          <div class="summary-card-val" style="color: #166534;">${formatPHP(summary.total_valid_payments)}</div>
        </div>
      </td>
      <td class="summary-card-td">
        <div class="summary-card">
          <div class="summary-card-label">Outstanding Balance</div>
          <div class="summary-card-val" style="color: #800020;">${formatPHP(summary.total_outstanding_balance)}</div>
        </div>
      </td>
      <td class="summary-card-td">
        <div class="summary-card ${summary.overdue_balance > 0 ? "summary-card-highlight" : ""}">
          <div class="summary-card-label">Overdue Balance</div>
          <div class="summary-card-val">${formatPHP(summary.overdue_balance)}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td class="summary-card-td">
        <div class="summary-card">
          <div class="summary-card-label">Active Contracts</div>
          <div class="summary-card-val" style="font-size: 11pt;">${summary.active_applications_count} active</div>
        </div>
      </td>
      <td class="summary-card-td">
        <div class="summary-card">
          <div class="summary-card-label">Total Refunds / Reversals</div>
          <div class="summary-card-val" style="font-size: 11pt; color: #7f1d1d;">${formatPHP(summary.total_refunded_reversed)}</div>
        </div>
      </td>
      <td class="summary-card-td">
        <div class="summary-card">
          <div class="summary-card-label">Next Due Date</div>
          <div class="summary-card-val" style="font-size: 11pt;">${summary.next_due_date ? `${summary.next_due_date} (${formatPHP(summary.next_scheduled_amount || 0)})` : "None"}</div>
        </div>
      </td>
      <td class="summary-card-td">
        <div class="summary-card">
          <div class="summary-card-label">Installment Progress</div>
          <div class="summary-card-val" style="font-size: 11pt;">${summary.paid_installments_count} paid / ${summary.remaining_installments_count} remaining</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- SECTION C: INSTALLMENT APPLICATION HISTORY -->
  <div class="section-title">SECTION C &mdash; Installment Application History</div>
  ${
    fileData.applications.length === 0
      ? '<div class="empty-note">No installment applications found for this client.</div>'
      : `
  <table class="data-table">
    <thead>
      <tr>
        <th>Application #</th>
        <th>Start Date</th>
        <th>Branch</th>
        <th>Service / Treatment</th>
        <th style="text-align: right;">Contract (₱)</th>
        <th style="text-align: right;">Down Payment</th>
        <th>Term / Freq</th>
        <th style="text-align: right;">Valid Paid</th>
        <th style="text-align: right;">Balance (₱)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.applications
        .map(
          (app) => `
        <tr>
          <td><strong>${app.application_number}</strong></td>
          <td>${app.contract_start_date}</td>
          <td>${app.branch_name || "Main Clinic"}</td>
          <td>${app.service_package_name}</td>
          <td style="text-align: right;"><strong>${formatPHP(app.original_contract_amount)}</strong></td>
          <td style="text-align: right;">${formatPHP(app.down_payment_received)}</td>
          <td>${app.number_of_installments}x (${app.frequency})</td>
          <td style="text-align: right; color: #166534;">${formatPHP(app.valid_payments_total || 0)}</td>
          <td style="text-align: right; font-weight: 700; color: #800020;">${formatPHP(app.outstanding_balance || 0)}</td>
          <td><span class="status-badge status-${app.status}">${app.status.toUpperCase()}</span></td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
  }

  <!-- SECTION D: INSTALLMENT PAYMENT SCHEDULE -->
  <div class="section-title">SECTION D &mdash; Installment Payment Schedule</div>
  ${
    fileData.schedules.length === 0
      ? '<div class="empty-note">No scheduled installment payments recorded.</div>'
      : `
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Due Date</th>
        <th style="text-align: right;">Scheduled Amount</th>
        <th style="text-align: right;">Amount Paid</th>
        <th style="text-align: right;">Remaining Balance</th>
        <th>Payment Date</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.schedules
        .map(
          (s) => `
        <tr>
          <td style="text-align: center;"><strong>${s.installment_number}</strong></td>
          <td>${s.due_date}</td>
          <td style="text-align: right;">${formatPHP(s.scheduled_amount)}</td>
          <td style="text-align: right; color: #166534;">${formatPHP(s.amount_paid)}</td>
          <td style="text-align: right; font-weight: 600;">${formatPHP(s.remaining_amount)}</td>
          <td>${s.payment_date || "&mdash;"}</td>
          <td><span class="status-badge status-${s.status}">${s.status.replace(/_/g, " ").toUpperCase()}</span></td>
          <td>${s.notes || ""}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
  }

  <!-- SECTION E: POS TRANSACTIONS & ITEM BREAKDOWN -->
  <div class="section-title">SECTION E &mdash; Complete POS Transaction History</div>
  ${
    fileData.posTransactions && fileData.posTransactions.length > 0
      ? `
  <table class="data-table">
    <thead>
      <tr>
        <th>Txn Ref</th>
        <th>Date &amp; Time</th>
        <th>Branch</th>
        <th>Cashier</th>
        <th>Items Purchased</th>
        <th style="text-align: right;">Total Amount</th>
        <th>Payment Method</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.posTransactions
        .map(
          (tx) => `
        <tr>
          <td><strong>${tx.reference_number}</strong></td>
          <td>${new Date(tx.transaction_date || tx.created_at || new Date().toISOString()).toLocaleString("en-PH")}</td>
          <td>${tx.branch_name}</td>
          <td>${tx.cashier_name || "Assigned Cashier"}</td>
          <td>${tx.items.length > 0 ? tx.items.map((i) => `${i.quantity}x ${i.item_name}`).join(", ") : "Retail Sale"}</td>
          <td style="text-align: right; font-weight: 600;">${formatPHP(tx.total_amount)}</td>
          <td>${tx.payment_method.toUpperCase()}</td>
          <td><span class="status-badge status-${tx.status}">${tx.status.toUpperCase()}</span></td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : '<div class="empty-note">No retail POS merchandise transactions recorded for this client.</div>'
  }

  <!-- SECTION F: COMPLETE PAYMENT HISTORY -->
  <div class="section-title">SECTION F &mdash; Complete Payment History</div>
  ${
    fileData.payments.length === 0
      ? '<div class="empty-note">No payment transactions recorded for this client.</div>'
      : `
  <table class="data-table">
    <thead>
      <tr>
        <th>Date &amp; Time</th>
        <th>Payment Ref</th>
        <th>Txn / App Ref</th>
        <th>Installment</th>
        <th style="text-align: right;">Amount Paid</th>
        <th>Method</th>
        <th>Branch</th>
        <th>Receipt / OR #</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.payments
        .map(
          (p) => `
        <tr>
          <td>${new Date(p.payment_date).toLocaleString("en-PH")}</td>
          <td><strong>${p.payment_reference}</strong></td>
          <td>${p.application_reference || p.transaction_reference || "&mdash;"}</td>
          <td style="text-align: center;">${p.installment_number !== null ? `#${p.installment_number}` : "&mdash;"}</td>
          <td style="text-align: right; font-weight: 600; color: ${p.is_valid_collection ? "#166534" : "#991b1b"};">
            ${p.is_valid_collection ? formatPHP(p.amount_paid) : `(${formatPHP(p.amount_paid)})`}
          </td>
          <td>${p.payment_method.toUpperCase()}</td>
          <td>${p.branch_name}</td>
          <td>${p.receipt_number || "&mdash;"}</td>
          <td>
            <span class="status-badge status-${p.status}">
              ${p.status.toUpperCase()}${!p.is_valid_collection ? " (REVERSED)" : ""}
            </span>
          </td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
  }

  <!-- SECTION G: APPOINTMENTS AND TREATMENTS -->
  <div class="section-title">SECTION G &mdash; Appointments and Treatments</div>
  ${
    fileData.appointments.length === 0
      ? '<div class="empty-note">No clinic appointments or treatments recorded.</div>'
      : `
  <table class="data-table">
    <thead>
      <tr>
        <th>Reference #</th>
        <th>Date</th>
        <th>Time</th>
        <th>Treatment / Service</th>
        <th>Branch</th>
        <th style="text-align: right;">Amount Due</th>
        <th>Payment Status</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.appointments
        .map(
          (a) => `
        <tr>
          <td><strong>${a.reference_number}</strong></td>
          <td>${a.appointment_date}</td>
          <td>${a.appointment_time}</td>
          <td>${a.treatment_name}</td>
          <td>${a.branch_name}</td>
          <td style="text-align: right;">${formatPHP(a.amount_due)}</td>
          <td><span class="status-badge status-${a.payment_status || 'unpaid'}">${(a.payment_status || "UNPAID").toUpperCase()}</span></td>
          <td><span class="status-badge status-${a.status || 'booked'}">${(a.status || "BOOKED").toUpperCase()}</span></td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
  }

  <!-- SECTION H: SERVICES, PACKAGES, AND MEMBERSHIPS -->
  <div class="section-title">SECTION H &mdash; Services, Packages, and Memberships</div>
  ${
    fileData.packages.length === 0
      ? '<div class="empty-note">No prepaid packages or memberships active.</div>'
      : `
  <table class="data-table">
    <thead>
      <tr>
        <th>Package Name</th>
        <th>Branch</th>
        <th style="text-align: center;">Total Sessions</th>
        <th style="text-align: center;">Remaining</th>
        <th style="text-align: right;">Price Paid</th>
        <th>Start Date</th>
        <th>Expiry Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.packages
        .map(
          (pkg) => `
        <tr>
          <td><strong>${pkg.package_name}</strong></td>
          <td>${pkg.branch_name || "Main Clinic"}</td>
          <td style="text-align: center;">${pkg.total_sessions}</td>
          <td style="text-align: center; font-weight: 700;">${pkg.sessions_remaining}</td>
          <td style="text-align: right;">${formatPHP(pkg.price_paid)}</td>
          <td>${pkg.start_date || (pkg.created_at ? pkg.created_at.slice(0, 10) : "N/A")}</td>
          <td>${pkg.expiry_date || pkg.expires_at || "No Expiry"}</td>
          <td><span class="status-badge status-${pkg.status || 'active'}">${(pkg.status || "ACTIVE").toUpperCase()}</span></td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
  }

  <!-- SECTION I: REFUNDS, VOIDS, AND ADJUSTMENTS -->
  <div class="section-title">SECTION I &mdash; Refunds, Voids, and Adjustments</div>
  ${
    fileData.refundsAdjustments && fileData.refundsAdjustments.length > 0
      ? `
  <table class="data-table">
    <thead>
      <tr>
        <th>Adjustment Ref</th>
        <th>Original Txn</th>
        <th>Date</th>
        <th>Branch</th>
        <th>Type</th>
        <th style="text-align: right;">Original Amount</th>
        <th style="text-align: right;">Adjusted Amount</th>
        <th>Reason</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.refundsAdjustments
        .map(
          (r) => `
        <tr>
          <td><strong>${r.reference_number}</strong></td>
          <td>${r.original_reference}</td>
          <td>${new Date(r.date).toLocaleString("en-PH")}</td>
          <td>${r.branch_name}</td>
          <td><span class="status-badge status-reversed">${(r.adjustment_type || "ADJUSTMENT").toUpperCase()}</span></td>
          <td style="text-align: right;">${formatPHP(r.original_amount)}</td>
          <td style="text-align: right; font-weight: 700; color: #991b1b;">${formatPHP(r.adjustment_amount)}</td>
          <td>${r.reason}</td>
          <td>${(r.approval_status || "COMPLETED").toUpperCase()}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : '<div class="empty-note">No payment refunds, cashier voids, or financial adjustments recorded.</div>'
  }

  <!-- SECTION J: RECEIPTS AND DOCUMENTS -->
  <div class="section-title">SECTION J &mdash; Receipts and Documents</div>
  ${
    fileData.receipts && fileData.receipts.length > 0
      ? `
  <table class="data-table">
    <thead>
      <tr>
        <th>Receipt / Document #</th>
        <th>Document Type</th>
        <th>Related Reference</th>
        <th>Date</th>
        <th>Branch</th>
        <th style="text-align: right;">Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.receipts
        .map(
          (rcpt) => `
        <tr>
          <td><strong>${rcpt.receipt_number}</strong></td>
          <td>${rcpt.document_type}</td>
          <td>${rcpt.related_reference}</td>
          <td>${new Date(rcpt.date).toLocaleDateString("en-PH")}</td>
          <td>${rcpt.branch_name}</td>
          <td style="text-align: right; font-weight: 600;">${rcpt.amount ? formatPHP(rcpt.amount) : "&mdash;"}</td>
          <td><span class="status-badge status-${rcpt.availability === 'available' ? 'paid' : 'pending'}">${rcpt.availability === 'available' ? 'AVAILABLE' : 'PENDING UPLOAD'}</span></td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : '<div class="empty-note">No formal receipt documents indexed.</div>'
  }

  <!-- SECTION K: COMPLETE CLIENT ACTIVITY TIMELINE -->
  <div class="section-title">SECTION K &mdash; Complete Client Activity Timeline</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 130px;">Date &amp; Time</th>
        <th style="width: 140px;">Activity Event</th>
        <th>Description</th>
        <th>Branch</th>
        <th>Reference #</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${fileData.timeline
        .slice(0, 50)
        .map(
          (item) => `
        <tr>
          <td style="font-size: 7.5pt;">${item.date_formatted}</td>
          <td><strong>${item.title}</strong></td>
          <td>${item.description}</td>
          <td>${item.branch_name || "Main Clinic"}</td>
          <td>${item.reference_number || "&mdash;"}</td>
          <td style="text-align: right; font-weight: 600;">${item.amount !== null && item.amount !== undefined ? formatPHP(item.amount) : "&mdash;"}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <!-- SIGNATURE AND OFFICIAL AUDIT SEAL BLOCK -->
  <div class="footer-stamp">
    <div>
      <div><strong>Certified Official Client Record</strong></div>
      <div>Clinic System Engine &bull; Cindyrella Aesthetic &amp; Wellness Management System</div>
      <div>Confidential Client Statement &bull; Generated by authorized officer: ${fileData.generated_by}</div>
      <div style="font-size: 7.5pt; color: #a0aec0; margin-top: 4px;">Hash: ${client.id.slice(0, 16)} &bull; Scope: ${fileData.branch_scope}</div>
    </div>
    <div class="sign-block">
      Authorized Signature / Clinic Manager
    </div>
  </div>

</body>
</html>
`;
}
