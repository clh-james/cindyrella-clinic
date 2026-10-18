// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// High-Fidelity Printable PDF / HTML Template for Complete Client History
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
  <title>Client History — ${client.full_name || client.first_name} (${client.customer_code || client.id})</title>
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
      font-size: 16pt;
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
      font-size: 10.5pt;
      font-weight: 700;
      color: #800020;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 18px;
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
      font-weight: 600;
      color: #4a5568;
      width: 18%;
    }

    .profile-value {
      color: #1a202c;
      width: 32%;
    }

    .kpi-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 14px;
    }

    .kpi-card {
      flex: 1 1 18%;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px;
      text-align: center;
      page-break-inside: avoid;
    }

    .kpi-label {
      font-size: 7.5pt;
      color: #718096;
      text-transform: uppercase;
      font-weight: 600;
    }

    .kpi-val {
      font-size: 11pt;
      font-weight: 700;
      color: #800020;
      margin-top: 2px;
      font-family: monospace;
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
      font-size: 8pt;
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
      margin-top: 25px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #718096;
      page-break-inside: avoid;
    }

    .sign-block {
      width: 200px;
      text-align: center;
      border-top: 1px solid #718096;
      padding-top: 4px;
      margin-top: 35px;
      font-size: 8pt;
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
      <span style="font-weight: 600;">Cindyrella Client Statement Viewer</span> &mdash; ${client.full_name || client.first_name} (${client.customer_code || client.id})
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
        <div class="doc-badge-title">COMPLETE CLIENT ACCOUNT HISTORY</div>
        <div class="doc-meta">Generated: ${new Date(fileData.generated_at).toLocaleString("en-PH")}</div>
        <div class="doc-meta">Authorized Scope: ${fileData.branch_scope}</div>
      </td>
    </tr>
  </table>

  <!-- SECTION 1: CLIENT INFORMATION -->
  <div class="section-title">1. Client Profile</div>
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
      <td class="profile-label">Email:</td>
      <td class="profile-value">${client.email || "N/A"}</td>
      <td class="profile-label">Loyalty Points:</td>
      <td class="profile-value"><strong>${client.loyalty_points || 0} pts</strong></td>
    </tr>
    <tr>
      <td class="profile-label">Complete Address:</td>
      <td class="profile-value" colspan="3">${client.address || "N/A"}</td>
    </tr>
    <tr>
      <td class="profile-label">Medical Alerts:</td>
      <td class="profile-value" colspan="3" style="color: #c53030;">${client.medical_conditions || client.allergies ? `${client.medical_conditions || ""} ${client.allergies ? `| Allergies: ${client.allergies}` : ""}` : "None reported"}</td>
    </tr>
  </table>

  <!-- SECTION 2: FINANCIAL SUMMARY -->
  <div class="section-title">2. Account Summary &amp; Balances</div>
  <div class="kpi-container">
    <div class="kpi-card">
      <div class="kpi-label">Total Contract Value</div>
      <div class="kpi-val">${formatPHP(summary.total_contract_value)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Valid Collections</div>
      <div class="kpi-val" style="color: #276749;">${formatPHP(summary.total_valid_payments)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Outstanding Balance</div>
      <div class="kpi-val" style="color: #c53030;">${formatPHP(summary.total_outstanding_balance)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Overdue Balance</div>
      <div class="kpi-val" style="color: #e53e3e;">${formatPHP(summary.overdue_balance)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Refunds / Reversals</div>
      <div class="kpi-val" style="color: #718096;">${formatPHP(summary.total_refunded_reversed)}</div>
    </div>
  </div>

  <!-- SECTION 3: INSTALLMENT APPLICATIONS -->
  <div class="section-title">3. Installment Applications &amp; Contracts</div>
  ${
    fileData.applications.length > 0
      ? `<table class="data-table">
          <thead>
            <tr>
              <th>Application #</th>
              <th>Contract Date</th>
              <th>Service / Package</th>
              <th>Branch</th>
              <th style="text-align: right;">Contract Value</th>
              <th style="text-align: right;">Down Payment</th>
              <th>Terms</th>
              <th style="text-align: right;">Outstanding</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${fileData.applications
              .map(
                (app) => `<tr>
                <td><strong>${app.application_number}</strong></td>
                <td>${app.contract_start_date}</td>
                <td>${app.service_package_name}</td>
                <td>${app.branch_name || "Main Clinic"}</td>
                <td style="text-align: right; font-family: monospace;">${formatPHP(app.original_contract_amount)}</td>
                <td style="text-align: right; font-family: monospace;">${formatPHP(app.down_payment_received)}</td>
                <td>${app.number_of_installments}x ${app.frequency}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600; color: ${app.outstanding_balance && app.outstanding_balance > 0 ? "#c53030" : "#22543d"};">${formatPHP(app.outstanding_balance)}</td>
                <td><span class="status-badge status-${app.status}">${app.status.toUpperCase()}</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : `<div class="empty-note">No installment applications on record for this client.</div>`
  }

  <!-- SECTION 4: INSTALLMENT PAYMENT SCHEDULES -->
  <div class="section-title">4. Installment Payment Schedules</div>
  ${
    fileData.schedules.length > 0
      ? `<table class="data-table">
          <thead>
            <tr>
              <th>Inst #</th>
              <th>Due Date</th>
              <th style="text-align: right;">Scheduled Amount</th>
              <th style="text-align: right;">Amount Paid</th>
              <th style="text-align: right;">Remaining</th>
              <th>Payment Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${fileData.schedules
              .map(
                (s) => `<tr>
                <td>#${s.installment_number}</td>
                <td>${s.due_date}</td>
                <td style="text-align: right; font-family: monospace;">${formatPHP(s.scheduled_amount)}</td>
                <td style="text-align: right; font-family: monospace; color: #22543d;">${formatPHP(s.amount_paid)}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600; color: ${s.remaining_amount > 0 ? "#c53030" : "#718096"};">${formatPHP(s.remaining_amount)}</td>
                <td>${s.payment_date || "Pending"}</td>
                <td><span class="status-badge status-${s.status}">${s.status.replace(/_/g, " ").toUpperCase()}</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : `<div class="empty-note">No scheduled installments recorded.</div>`
  }

  <!-- SECTION 5: COMPLETE PAYMENT HISTORY -->
  <div class="section-title">5. Complete Payment History</div>
  ${
    fileData.payments.length > 0
      ? `<table class="data-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Payment Ref</th>
              <th>Txn / App Ref</th>
              <th>Method</th>
              <th>Branch</th>
              <th style="text-align: right;">Amount Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${fileData.payments
              .map(
                (p) => `<tr>
                <td>${new Date(p.payment_date).toLocaleString("en-PH")}</td>
                <td><strong>${p.payment_reference}</strong>${p.receipt_number ? ` (OR# ${p.receipt_number})` : ""}</td>
                <td>${p.application_reference || p.transaction_reference || "N/A"}</td>
                <td>${p.payment_method.toUpperCase()}</td>
                <td>${p.branch_name}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatPHP(p.amount_paid)}</td>
                <td><span class="status-badge status-${p.status}">${p.status.toUpperCase()}</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : `<div class="empty-note">No payment transactions recorded for this client.</div>`
  }

  <!-- SECTION 6: APPOINTMENTS AND CLINIC TREATMENTS -->
  <div class="section-title">6. Appointments &amp; Treatments Rendered</div>
  ${
    fileData.appointments.length > 0
      ? `<table class="data-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Date &amp; Time</th>
              <th>Treatment / Service</th>
              <th>Branch</th>
              <th style="text-align: right;">Fee</th>
              <th>Pay Status</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${fileData.appointments
              .map(
                (a) => `<tr>
                <td><strong>${a.reference_number}</strong></td>
                <td>${a.appointment_date} ${a.appointment_time}</td>
                <td>${a.treatment_name}</td>
                <td>${a.branch_name}</td>
                <td style="text-align: right; font-family: monospace;">${formatPHP(a.amount_due)}</td>
                <td><span class="status-badge status-${a.payment_status}">${a.payment_status.toUpperCase()}</span></td>
                <td><span class="status-badge status-${a.status}">${a.status.toUpperCase()}</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : `<div class="empty-note">No appointments or clinical treatment sessions found.</div>`
  }

  <!-- SECTION 7: PACKAGES AND MEMBERSHIPS -->
  <div class="section-title">7. Packages &amp; Treatment Memberships</div>
  ${
    fileData.packages.length > 0
      ? `<table class="data-table">
          <thead>
            <tr>
              <th>Package Name</th>
              <th>Branch</th>
              <th>Total Sessions</th>
              <th>Remaining</th>
              <th style="text-align: right;">Amount Paid</th>
              <th>Validity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${fileData.packages
              .map(
                (pkg) => `<tr>
                <td><strong>${pkg.package_name}</strong></td>
                <td>${pkg.branch_name || "Main Clinic"}</td>
                <td>${pkg.total_sessions}</td>
                <td><strong>${pkg.sessions_remaining}</strong></td>
                <td style="text-align: right; font-family: monospace;">${formatPHP(pkg.price_paid)}</td>
                <td>${pkg.expiry_date || "No Expiry"}</td>
                <td><span class="status-badge status-${pkg.status}">${pkg.status.toUpperCase()}</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : `<div class="empty-note">No prepaid packages or membership plans registered.</div>`
  }

  <!-- SECTION 8: ACTIVITY TIMELINE -->
  <div class="section-title">8. Complete Activity Timeline</div>
  ${
    fileData.timeline.length > 0
      ? `<table class="data-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Activity Type</th>
              <th>Title &amp; Reference</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
              <th>Branch</th>
            </tr>
          </thead>
          <tbody>
            ${fileData.timeline.slice(0, 50)
              .map(
                (t) => `<tr>
                <td>${t.date_formatted}</td>
                <td><span class="status-badge" style="background: #edf2f7; color: #4a5568;">${t.type.replace(/_/g, " ").toUpperCase()}</span></td>
                <td><strong>${t.title}</strong>${t.reference_number ? ` (${t.reference_number})` : ""}</td>
                <td>${t.description}</td>
                <td style="text-align: right; font-family: monospace;">${t.amount !== null && t.amount !== undefined ? formatPHP(t.amount) : "-"}</td>
                <td>${t.branch_name || "Main Clinic"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
      : `<div class="empty-note">No timeline activity on record.</div>`
  }

  <!-- SIGNATURE AND AUDIT FOOTER -->
  <div class="footer-stamp">
    <div>
      <div><strong>Certified Official Client Record</strong></div>
      <div>Extracted by: ${fileData.generated_by}</div>
      <div>Timestamp: ${new Date(fileData.generated_at).toLocaleString("en-PH")} (Asia/Manila)</div>
      <div style="font-size: 7.5pt; color: #a0aec0; margin-top: 4px;">Cindyrella Aesthetic & Wellness Clinic Management System &bull; Confidential &bull; Authorized Personnel Only</div>
    </div>
    <div class="sign-block">
      Authorized Signature / Clinic Officer
    </div>
  </div>

</body>
</html>`;
}
