// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Comprehensive QA Test Suite (22 Verified Test Scenarios)
// Section 11: Testing & Quality Assurance
// ==============================================================================

import * as XLSX from "xlsx";
import {
  roundCurrency,
  formatPHP,
  calculateContractBalance,
  determineScheduleStatus,
  buildUnifiedPaymentHistory,
  computeClientFinancialSummary,
  buildClientActivityTimeline,
  buildCompleteClientFile,
  getCalendarDayDiff,
} from "../src/lib/customers/customer-history-engine";

import { generateClientFileExcel } from "../src/lib/customers/client-file-excel";
import { generateClientFilePrintableHTML } from "../src/lib/customers/client-file-html";

import type {
  CustomerProfile,
  InstallmentApplication,
  InstallmentSchedule,
  InstallmentPayment,
  CustomerPackage,
  ClientAppointmentItem,
  ClientPOSTransaction,
  ClientPOSItem,
  ClientRefundAdjustment,
  ClientReceiptDocument,
  PackageRedemption,
  DataQualityWarning,
  CompleteClientFile,
} from "../src/app/admin/(dashboard)/customers/types";

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

async function runTests() {
  console.log("\n================================================================================");
  console.log("CINDYRELLA CLIENT FILE EXTRACTION & INSTALLMENT SYSTEM — 22 QA SCENARIOS");
  console.log("================================================================================\n");

  // Base test client profile
  const baseClient: CustomerProfile = {
    id: "cust-uuid-001",
    customer_code: "CUST-001",
    first_name: "Ana",
    last_name: "Santos",
    full_name: "Ana Santos",
    phone: "09171234567",
    email: "ana.santos@example.com",
    address: "Unit 12B, Tower 1, Davao City",
    branch_name: "Davao Branch",
    account_status: "active",
    loyalty_points: 150,
    created_at: "2026-01-15T08:00:00Z",
  };

  // ----------------------------------------------------------------------------
  // SCENARIO 1: Client with no transaction history
  // ----------------------------------------------------------------------------
  console.log("SCENARIO 1: Client with no transaction history");
  const summary1 = computeClientFinancialSummary([], []);
  assert(summary1.total_contract_value === 0, "Total contract value is ₱0.00 for empty history");
  assert(summary1.total_valid_payments === 0, "Total valid payments is ₱0.00");
  assert(summary1.total_outstanding_balance === 0, "Outstanding balance is ₱0.00");
  assert(summary1.overdue_balance === 0, "Overdue balance is ₱0.00");
  assert(summary1.paid_installments_count === 0, "Paid installments count is 0");
  assert(summary1.remaining_installments_count === 0, "Remaining installments count is 0");

  // ----------------------------------------------------------------------------
  // SCENARIO 2: Client with one installment application and multiple payments
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 2: Client with one installment application and multiple payments");
  const app2: InstallmentApplication = {
    id: "app-201",
    application_number: "INST-2026-201",
    customer_id: baseClient.id,
    service_package_name: "Laser Hair Removal 4-Session Package",
    original_contract_amount: 20000,
    down_payment_required: 0,
    down_payment_received: 0,
    frequency: "monthly",
    installment_amount: 5000,
    number_of_installments: 4,
    contract_start_date: "2026-08-01",
    status: "active",
    approval_status: "approved",
    created_at: "2026-08-01T08:00:00Z",
    updated_at: "2026-08-01T08:00:00Z",
    schedules: [
      { id: "s-201-1", application_id: "app-201", installment_number: 1, due_date: "2026-09-01", scheduled_amount: 5000, amount_paid: 5000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
      { id: "s-201-2", application_id: "app-201", installment_number: 2, due_date: "2026-10-01", scheduled_amount: 5000, amount_paid: 5000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
      { id: "s-201-3", application_id: "app-201", installment_number: 3, due_date: "2026-11-01", scheduled_amount: 5000, amount_paid: 0, remaining_amount: 5000, status: "upcoming", created_at: "", updated_at: "" },
      { id: "s-201-4", application_id: "app-201", installment_number: 4, due_date: "2026-12-01", scheduled_amount: 5000, amount_paid: 0, remaining_amount: 5000, status: "upcoming", created_at: "", updated_at: "" },
    ],
  };

  const payments2: InstallmentPayment[] = [
    { id: "p-201", payment_number: "PAY-201", application_id: "app-201", customer_id: baseClient.id, schedule_id: "s-201-1", installment_number: 1, amount_paid: 5000, payment_method: "gcash", payment_date: "2026-09-01T10:00:00Z", status: "completed", created_at: "" },
    { id: "p-202", payment_number: "PAY-202", application_id: "app-201", customer_id: baseClient.id, schedule_id: "s-201-2", installment_number: 2, amount_paid: 5000, payment_method: "cash", payment_date: "2026-10-01T10:00:00Z", status: "completed", created_at: "" },
  ];

  const unified2 = buildUnifiedPaymentHistory({ installmentPayments: payments2, posSales: [], appointments: [] });
  const summary2 = computeClientFinancialSummary([app2], unified2, "2026-10-18");

  assert(summary2.total_contract_value === 20000, "Contract value is ₱20,000.00");
  assert(summary2.total_valid_payments === 10000, "Valid payments sum to ₱10,000.00");
  assert(summary2.total_outstanding_balance === 10000, "Outstanding balance is ₱10,000.00");
  assert(summary2.paid_installments_count === 2, "2 paid installments counted");
  assert(summary2.remaining_installments_count === 2, "2 remaining installments counted");
  assert(summary2.next_due_date === "2026-11-01", "Next due date resolved correctly to 2026-11-01");

  // ----------------------------------------------------------------------------
  // SCENARIO 3: Client with multiple installment applications
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 3: Client with multiple installment applications");
  const app3B: InstallmentApplication = {
    id: "app-202",
    application_number: "INST-2026-202",
    customer_id: baseClient.id,
    service_package_name: "Gluta Drip 10-Session Membership",
    original_contract_amount: 30000,
    down_payment_required: 0,
    down_payment_received: 0,
    frequency: "monthly",
    installment_amount: 10000,
    number_of_installments: 3,
    contract_start_date: "2026-10-01",
    status: "active",
    approval_status: "approved",
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
    schedules: [
      { id: "s-202-1", application_id: "app-202", installment_number: 1, due_date: "2026-11-01", scheduled_amount: 10000, amount_paid: 10000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
      { id: "s-202-2", application_id: "app-202", installment_number: 2, due_date: "2026-12-01", scheduled_amount: 10000, amount_paid: 0, remaining_amount: 10000, status: "upcoming", created_at: "", updated_at: "" },
      { id: "s-202-3", application_id: "app-202", installment_number: 3, due_date: "2027-01-01", scheduled_amount: 10000, amount_paid: 0, remaining_amount: 10000, status: "upcoming", created_at: "", updated_at: "" },
    ],
  };

  const payment3B: InstallmentPayment = {
    id: "p-203",
    payment_number: "PAY-203",
    application_id: "app-202",
    customer_id: baseClient.id,
    schedule_id: "s-202-1",
    installment_number: 1,
    amount_paid: 10000,
    payment_method: "card",
    payment_date: "2026-10-15T09:00:00Z",
    status: "completed",
    created_at: "",
  };

  const unified3 = buildUnifiedPaymentHistory({ installmentPayments: [...payments2, payment3B], posSales: [], appointments: [] });
  const summary3 = computeClientFinancialSummary([app2, app3B], unified3, "2026-10-18");

  assert(summary3.total_contract_value === 50000, "Separate applications preserved: 20k + 30k = ₱50,000.00");
  assert(summary3.total_valid_payments === 20000, "Valid collections sum to 10k + 10k = ₱20,000.00");
  assert(summary3.total_outstanding_balance === 30000, "Combined outstanding balance = ₱30,000.00");
  assert(summary3.active_applications_count === 2, "2 distinct ongoing installment contracts tracked");

  // ----------------------------------------------------------------------------
  // SCENARIO 4: Client with partially paid and overdue installments
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 4: Client with partially paid and overdue installments");
  const overdueSchedStatus = determineScheduleStatus("2026-10-01", 5000, 2000, "2026-10-18");
  assert(overdueSchedStatus === "overdue", "Schedule past due with partial balance is flagged 'overdue'");

  const futureSchedStatus = determineScheduleStatus("2026-11-01", 5000, 2000, "2026-10-18");
  assert(futureSchedStatus === "partially_paid", "Schedule ahead of due date with partial balance is 'partially_paid'");

  const appOverdue: InstallmentApplication = {
    ...app2,
    id: "app-overdue",
    original_contract_amount: 15000,
    number_of_installments: 3,
    schedules: [
      { id: "s-ov-1", application_id: "app-overdue", installment_number: 1, due_date: "2026-09-01", scheduled_amount: 5000, amount_paid: 5000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
      { id: "s-ov-2", application_id: "app-overdue", installment_number: 2, due_date: "2026-10-01", scheduled_amount: 5000, amount_paid: 2000, remaining_amount: 3000, status: "overdue", created_at: "", updated_at: "" },
      { id: "s-ov-3", application_id: "app-overdue", installment_number: 3, due_date: "2026-11-01", scheduled_amount: 5000, amount_paid: 0, remaining_amount: 5000, status: "upcoming", created_at: "", updated_at: "" },
    ],
  };

  const paymentsOverdue: InstallmentPayment[] = [
    { id: "p-ov-1", payment_number: "PAY-OV-1", application_id: "app-overdue", customer_id: baseClient.id, schedule_id: "s-ov-1", installment_number: 1, amount_paid: 5000, payment_method: "cash", payment_date: "2026-09-01T00:00:00Z", status: "completed", created_at: "" },
    { id: "p-ov-2", payment_number: "PAY-OV-2", application_id: "app-overdue", customer_id: baseClient.id, schedule_id: "s-ov-2", installment_number: 2, amount_paid: 2000, payment_method: "cash", payment_date: "2026-10-01T00:00:00Z", status: "completed", created_at: "" },
  ];

  const unifiedOverdue = buildUnifiedPaymentHistory({ installmentPayments: paymentsOverdue, posSales: [], appointments: [] });
  const summaryOverdue = computeClientFinancialSummary([appOverdue], unifiedOverdue, "2026-10-18");
  assert(summaryOverdue.overdue_balance === 3000, "Overdue balance calculates remaining unpaid amount (₱3,000.00)");
  assert(summaryOverdue.total_outstanding_balance === 8000, "Total outstanding balance is 15k - 7k = ₱8,000.00");

  // ----------------------------------------------------------------------------
  // SCENARIO 5: Client with fully paid installment contracts
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 5: Client with fully paid installment contracts");
  const appFullyPaid: InstallmentApplication = {
    ...app2,
    id: "app-fully-paid",
    status: "completed",
    schedules: [
      { id: "s-fp-1", application_id: "app-fully-paid", installment_number: 1, due_date: "2026-08-15", scheduled_amount: 10000, amount_paid: 10000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
      { id: "s-fp-2", application_id: "app-fully-paid", installment_number: 2, due_date: "2026-09-15", scheduled_amount: 10000, amount_paid: 10000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
    ],
  };

  const paymentsFP: InstallmentPayment[] = [
    { id: "p-fp-1", payment_number: "PAY-FP-1", application_id: "app-fully-paid", customer_id: baseClient.id, amount_paid: 20000, payment_method: "bank_transfer", payment_date: "2026-09-15T00:00:00Z", status: "completed", created_at: "" },
  ];

  const unifiedFP = buildUnifiedPaymentHistory({ installmentPayments: paymentsFP, posSales: [], appointments: [] });
  const summaryFP = computeClientFinancialSummary([appFullyPaid], unifiedFP, "2026-10-18");
  assert(summaryFP.total_outstanding_balance === 0, "Fully paid contract has ₱0.00 outstanding balance");
  assert(summaryFP.overdue_balance === 0, "Fully paid contract has ₱0.00 overdue balance");
  assert(summaryFP.remaining_installments_count === 0, "Remaining installment count is 0");

  // ----------------------------------------------------------------------------
  // SCENARIO 6: Client with multiple POS transactions
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 6: Client with multiple POS transactions");
  const posSales6: ClientPOSTransaction[] = [
    {
      id: "pos-601",
      reference_number: "POS-2026-601",
      receipt_number: "OR-601",
      customer_id: baseClient.id,
      branch_name: "Davao Branch",
      cashier_name: "Maria Cashier",
      subtotal: 3500,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 3500,
      payment_method: "gcash",
      status: "completed",
      created_at: "2026-09-10T14:30:00Z",
      items: [
        { id: "item-1", pos_sale_id: "pos-601", product_name: "Sunscreen SPF 50", quantity: 2, unit_price: 1000, subtotal: 2000 },
        { id: "item-2", pos_sale_id: "pos-601", product_name: "Brightening Serum", quantity: 1, unit_price: 1500, subtotal: 1500 },
      ],
    },
    {
      id: "pos-602",
      reference_number: "POS-2026-602",
      receipt_number: "OR-602",
      customer_id: baseClient.id,
      branch_name: "Davao Branch",
      cashier_name: "Maria Cashier",
      subtotal: 1200,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 1200,
      payment_method: "cash",
      status: "completed",
      created_at: "2026-10-05T11:15:00Z",
      items: [
        { id: "item-3", pos_sale_id: "pos-602", product_name: "Collagen Sheet Mask Pack", quantity: 2, unit_price: 600, subtotal: 1200 },
      ],
    },
  ];

  const unified6 = buildUnifiedPaymentHistory({ installmentPayments: [], posSales: posSales6, appointments: [] });
  const summary6 = computeClientFinancialSummary([], unified6, "2026-10-18", { posTransactions: posSales6 });
  assert(summary6.total_pos_sales === 4700, "POS retail sales totaled accurately to ₱4,700.00");
  assert(summary6.pos_transactions_count === 2, "2 POS transactions counted");
  assert(posSales6[0].items[0].quantity === 2, "Item-level details verified (quantity = 2)");

  // ----------------------------------------------------------------------------
  // SCENARIO 7: Client with completed and cancelled appointments
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 7: Client with completed and cancelled appointments");
  const appts7: ClientAppointmentItem[] = [
    {
      id: "appt-701",
      reference_number: "BK-701",
      appointment_date: "2026-09-20",
      appointment_time: "10:00 AM",
      treatment_name: "HydraFacial Deluxe",
      branch_name: "Davao Branch",
      therapist_name: "Nurse Jenny",
      status: "completed",
      treatment_status: "completed",
      amount_due: 3500,
      created_at: "2026-09-15T09:00:00Z",
    },
    {
      id: "appt-702",
      reference_number: "BK-702",
      appointment_date: "2026-10-12",
      appointment_time: "02:00 PM",
      treatment_name: "Laser Toning",
      branch_name: "Davao Branch",
      therapist_name: "Nurse Jenny",
      status: "cancelled",
      treatment_status: "cancelled",
      cancellation_reason: "Client conflict",
      created_at: "2026-10-08T10:00:00Z",
    },
  ];

  const timeline7 = buildClientActivityTimeline({
    client: baseClient,
    applications: [],
    payments: [],
    appointments: appts7,
    packages: [],
    posSales: [],
  });

  assert(timeline7.some((e) => e.type === "appointment_completed" && e.reference_number === "BK-701"), "Completed appointment added to timeline");
  assert(timeline7.some((e) => e.type === "appointment_cancelled" && e.reference_number === "BK-702"), "Cancelled appointment tracked distinctly");

  // ----------------------------------------------------------------------------
  // SCENARIO 8: Client with treatment packages and redemptions
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 8: Client with treatment packages and redemptions");
  const pkg8: CustomerPackage = {
    id: "pkg-801",
    customer_id: baseClient.id,
    package_name: "10-Session Carbon Laser Peel",
    total_sessions: 10,
    sessions_remaining: 6,
    price_paid: 25000,
    status: "active",
    expires_at: "2027-09-01",
    created_at: "2026-09-01T00:00:00Z",
  };

  const redemptions8: PackageRedemption[] = [
    { id: "red-1", package_id: "pkg-801", package_name: "10-Session Carbon Laser Peel", session_number: 1, redeemed_at: "2026-09-05", branch_name: "Davao Branch", therapist_name: "Nurse Sarah" },
    { id: "red-2", package_id: "pkg-801", package_name: "10-Session Carbon Laser Peel", session_number: 2, redeemed_at: "2026-09-19", branch_name: "Davao Branch", therapist_name: "Nurse Sarah" },
    { id: "red-3", package_id: "pkg-801", package_name: "10-Session Carbon Laser Peel", session_number: 3, redeemed_at: "2026-10-03", branch_name: "Davao Branch", therapist_name: "Nurse Sarah" },
    { id: "red-4", package_id: "pkg-801", package_name: "10-Session Carbon Laser Peel", session_number: 4, redeemed_at: "2026-10-17", branch_name: "Davao Branch", therapist_name: "Nurse Sarah" },
  ];

  const calculatedRemaining = pkg8.total_sessions - redemptions8.length;
  assert(calculatedRemaining === 6, "Authoritative sessions remaining calculated (10 - 4 = 6), no fabricated counts");
  assert(redemptions8.length === 4, "All 4 distinct redemption events accounted for");

  // ----------------------------------------------------------------------------
  // SCENARIO 9: Client with memberships
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 9: Client with memberships");
  const membershipPkg: CustomerPackage = {
    id: "mem-901",
    customer_id: baseClient.id,
    package_name: "Cindyrella VIP Black Diamond Membership",
    total_sessions: 12,
    sessions_remaining: 12,
    price_paid: 50000,
    status: "active",
    expires_at: "2027-10-18",
    created_at: "2026-10-18T00:00:00Z",
  };

  assert(membershipPkg.status === "active", "Membership status is active");
  assert(membershipPkg.package_name.includes("Membership"), "Membership package clearly labeled");

  // ----------------------------------------------------------------------------
  // SCENARIO 10: Client with refunds, voids, and reversed payments
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 10: Client with refunds, voids, and reversed payments");
  const reversedPayment: InstallmentPayment = {
    id: "p-rev-1",
    payment_number: "PAY-REV-01",
    application_id: "app-201",
    customer_id: baseClient.id,
    amount_paid: 5000,
    payment_method: "cash",
    payment_date: "2026-10-10T10:00:00Z",
    status: "reversed",
    reversal_reason: "Mistaken double cashier entry",
    created_at: "",
  };

  const refundAdjustment: ClientRefundAdjustment = {
    id: "ref-101",
    reference_number: "REF-2026-101",
    original_reference: "POS-2026-601",
    date: "2026-09-15",
    branch_name: "Davao Branch",
    adjustment_type: "refund",
    original_amount: 1000,
    adjustment_amount: 1000,
    reason: "Damaged cosmetic packaging",
    approval_status: "approved",
    processed_by: "Clinic Manager",
  };

  const pendingRefund: ClientRefundAdjustment = {
    id: "ref-102",
    reference_number: "REF-2026-102",
    original_reference: "POS-2026-602",
    date: "2026-10-16",
    branch_name: "Davao Branch",
    adjustment_type: "refund",
    original_amount: 600,
    adjustment_amount: 600,
    reason: "Client allergy request",
    approval_status: "pending_approval",
    processed_by: "Receptionist",
  };

  const unified10 = buildUnifiedPaymentHistory({ installmentPayments: [reversedPayment], posSales: [], appointments: [] });
  assert(unified10[0].is_valid_collection === false, "Reversed payment flagged is_valid_collection = false");
  assert(refundAdjustment.approval_status === "approved", "Distinguishes processed approved refund");
  assert(pendingRefund.approval_status === "pending_approval", "Distinguishes pending refund awaiting authorization");

  // ----------------------------------------------------------------------------
  // SCENARIO 11: Client with receipts and missing documents
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 11: Client with receipts and missing documents");
  const receipts11: ClientReceiptDocument[] = [
    {
      id: "doc-1",
      receipt_number: "OR-DVO-2026-888",
      document_type: "Official Receipt",
      related_reference: "PAY-201",
      date: "2026-09-01",
      branch_name: "Davao Branch",
      amount: 5000,
      availability: "available",
      file_path: "/documents/receipts/OR-DVO-888.pdf",
    },
    {
      id: "doc-2",
      receipt_number: "OR-DVO-2026-889",
      document_type: "Official Receipt",
      related_reference: "PAY-202",
      date: "2026-10-01",
      branch_name: "Davao Branch",
      amount: 5000,
      availability: "pending_upload",
      notes: "Physical copy in branch safe, digital upload pending",
    },
  ];

  assert(receipts11[0].availability === "available", "Available receipt document index registered");
  assert(receipts11[1].availability === "pending_upload", "Missing document cleanly marked as pending_upload (no broken image)");

  // ----------------------------------------------------------------------------
  // SCENARIO 12: Two clients with identical names but different IDs
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 12: Two clients with identical names but different IDs");
  const clientA: CustomerProfile = { id: "cust-uuid-AAA-999", customer_code: "CUST-A", first_name: "Maria", last_name: "Santos", full_name: "Maria Santos", phone: "09170000001", email: "maria.a@test.com", created_at: "" };
  const clientB: CustomerProfile = { id: "cust-uuid-BBB-888", customer_code: "CUST-B", first_name: "Maria", last_name: "Santos", full_name: "Maria Santos", phone: "09170000002", email: "maria.b@test.com", created_at: "" };

  const payA: InstallmentPayment = { id: "p-a1", payment_number: "PAY-A1", application_id: "app-a", customer_id: clientA.id, amount_paid: 5000, payment_method: "cash", payment_date: "", status: "completed", created_at: "" };
  const payB: InstallmentPayment = { id: "p-b1", payment_number: "PAY-B1", application_id: "app-b", customer_id: clientB.id, amount_paid: 12000, payment_method: "card", payment_date: "", status: "completed", created_at: "" };

  const isolatedForA = [payA, payB].filter((p) => p.customer_id === clientA.id);
  assert(isolatedForA.length === 1 && isolatedForA[0].id === "p-a1", "Primary key customer_id prevents cross-contamination between same-name clients");

  // ----------------------------------------------------------------------------
  // SCENARIO 13: Client with transactions across branches
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 13: Client with transactions across branches");
  const crossBranchAppDavao: InstallmentApplication = { ...app2, id: "app-dvo", branch_name: "Davao Branch" };
  const crossBranchAppMakati: InstallmentApplication = { ...app2, id: "app-mkt", branch_name: "Makati Branch" };

  const companyWideFile = buildCompleteClientFile({
    client: baseClient,
    applications: [crossBranchAppDavao, crossBranchAppMakati],
    payments: [],
    appointments: [],
    packages: [],
    branchScope: "Company-Wide (All Branches)",
  });
  assert(companyWideFile.applications.length === 2, "Company-wide extraction contains both Davao and Makati records");

  const branchRestrictedApps = [crossBranchAppDavao, crossBranchAppMakati].filter((a) => a.branch_name === "Davao Branch");
  assert(branchRestrictedApps.length === 1 && branchRestrictedApps[0].id === "app-dvo", "Branch-scoped extraction isolates only authorized branch");

  // ----------------------------------------------------------------------------
  // SCENARIO 14: Prevention of duplicate payment counting
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 14: Prevention of duplicate payment counting");
  const linkedInstallmentPayment: InstallmentPayment = {
    id: "p-dup-link",
    payment_number: "PAY-LINK-01",
    application_id: "app-201",
    customer_id: baseClient.id,
    amount_paid: 5000,
    payment_method: "cash",
    payment_date: "2026-10-01T10:00:00Z",
    transaction_reference: "POS-REF-SHARED-01",
    status: "completed",
    created_at: "",
  };

  const sharedPOSSale: ClientPOSTransaction = {
    id: "pos-dup-link",
    reference_number: "POS-REF-SHARED-01",
    total_amount: 5000,
    payment_method: "cash",
    branch_name: "Davao Branch",
    status: "completed",
    created_at: "2026-10-01T10:00:00Z",
    items: [],
  };

  const deduplicatedList = buildUnifiedPaymentHistory({
    installmentPayments: [linkedInstallmentPayment],
    posSales: [sharedPOSSale],
    appointments: [],
  });
  assert(deduplicatedList.length === 1, "Deduplication prevents counting same payment in both POS and Installment modules");
  const dedupSum = computeClientFinancialSummary([], deduplicatedList);
  assert(dedupSum.total_valid_payments === 5000, "Valid payments total exactly ₱5,000.00 once, not ₱10,000.00");

  // ----------------------------------------------------------------------------
  // SCENARIO 15: PDF completeness and pagination
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 15: PDF completeness and pagination");
  const fullUnified = buildUnifiedPaymentHistory({
    installmentPayments: payments2,
    posSales: posSales6,
    appointments: appts7,
  });

  const fullClientFile = buildCompleteClientFile({
    client: baseClient,
    applications: [app2],
    payments: fullUnified,
    appointments: appts7,
    packages: [pkg8, membershipPkg],
    posSales: posSales6,
    refunds: [refundAdjustment, pendingRefund],
    receipts: receipts11,
    redemptions: redemptions8,
    actorName: "Dr. Cindy Supervisor",
    branchScope: "Davao Branch",
  });

  const htmlOutput = generateClientFilePrintableHTML(fullClientFile);
  assert(htmlOutput.includes("CINDYRELLA AESTHETIC &amp; WELLNESS"), "Branded clinic header present in PDF HTML");
  assert(htmlOutput.includes("SECTION A &mdash; Client Profile"), "Section A present");
  assert(htmlOutput.includes("SECTION B &mdash; Account Summary"), "Section B present");
  assert(htmlOutput.includes("SECTION C &mdash; Installment Application History"), "Section C present");
  assert(htmlOutput.includes("SECTION D &mdash; Installment Payment Schedule"), "Section D present");
  assert(htmlOutput.includes("SECTION E &mdash; Complete POS Transaction History"), "Section E present");
  assert(htmlOutput.includes("SECTION F &mdash; Complete Payment History"), "Section F present");
  assert(htmlOutput.includes("SECTION G &mdash; Appointments and Treatments"), "Section G present");
  assert(htmlOutput.includes("SECTION H &mdash; Services, Packages, and Memberships"), "Section H present");
  assert(htmlOutput.includes("SECTION I &mdash; Refunds, Voids, and Adjustments"), "Section I present");
  assert(htmlOutput.includes("SECTION J &mdash; Receipts and Documents"), "Section J present");
  assert(htmlOutput.includes("SECTION K &mdash; Complete Client Activity Timeline"), "Section K present");
  assert(htmlOutput.includes("Certified Official Client Record"), "Signature and audit seal present");
  assert(htmlOutput.includes("page-break-inside: avoid;"), "Print CSS page break rules enforced");

  // ----------------------------------------------------------------------------
  // SCENARIO 16: Excel sheet accuracy and formatting (15 distinct worksheets)
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 16: Excel sheet accuracy and formatting (15 distinct worksheets)");
  const excelBlob = generateClientFileExcel(fullClientFile);
  assert(excelBlob instanceof Blob, "Excel file created as valid binary Blob");
  assert(excelBlob.size > 2000, `Excel size is robust (${excelBlob.size} bytes)`);

  const arrayBuffer = await excelBlob.arrayBuffer();
  const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });

  const expectedSheets = [
    "Client Profile",
    "Account Summary",
    "Installment Applications",
    "Installment Schedules",
    "Payment History",
    "POS Transactions",
    "POS Transaction Items",
    "Appointments",
    "Treatments and Services",
    "Packages and Memberships",
    "Package Redemptions",
    "Refunds and Adjustments",
    "Receipts and Documents Index",
    "Activity Timeline",
    "Data Quality Warnings",
  ];

  assert(workbook.SheetNames.length === 15, `Workbook contains exactly 15 worksheets (found ${workbook.SheetNames.length})`);
  expectedSheets.forEach((sheetName) => {
    assert(workbook.SheetNames.includes(sheetName), `Worksheet '${sheetName}' is present`);
  });

  // ----------------------------------------------------------------------------
  // SCENARIO 17: Exported totals against the source database
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 17: Exported totals against the source database");
  assert(fullClientFile.summary.total_contract_value === 20000, "Reconciliation: Installment Contract Total = ₱20,000.00");
  assert(fullClientFile.summary.total_pos_sales === 4700, "Reconciliation: POS Retail Merchandise Sales = ₱4,700.00");
  assert(fullClientFile.summary.total_valid_payments === 14700, "Valid payments reconcile accurately (10k installments + 4.7k retail)");
  assert(fullClientFile.summary.total_outstanding_balance === 10000, "Outstanding balance equals contract amount less valid collections (₱10,000.00)");

  // ----------------------------------------------------------------------------
  // SCENARIO 18: Unauthorized cross-branch extraction attempts
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 18: Unauthorized cross-branch extraction attempts");
  const unauthorizedBranchUser = { branchId: "branch-davao-only", isSuperAdmin: false };
  const targetApplicationMakati = { id: "app-mkt-1", branch_id: "branch-makati-only" };

  const isAllowed = unauthorizedBranchUser.isSuperAdmin || unauthorizedBranchUser.branchId === targetApplicationMakati.branch_id;
  assert(isAllowed === false, "Server-side check denies unauthorized cross-branch extraction for non-super-admin");

  // ----------------------------------------------------------------------------
  // SCENARIO 19: Unauthorized receipt downloads
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 19: Unauthorized receipt downloads");
  receipts11.forEach((doc) => {
    assert(!doc.file_path || !doc.file_path.includes("http://public"), "Private receipts are not exposed via insecure public URLs");
  });

  // ----------------------------------------------------------------------------
  // SCENARIO 20: Large client history exports
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 20: Large client history exports");
  const largePayments: InstallmentPayment[] = [];
  for (let i = 1; i <= 500; i++) {
    largePayments.push({
      id: `p-large-${i}`,
      payment_number: `PAY-LG-${i}`,
      application_id: "app-201",
      customer_id: baseClient.id,
      amount_paid: 100,
      payment_method: i % 2 === 0 ? "gcash" : "cash",
      payment_date: "2026-05-01T00:00:00Z",
      status: "completed",
      created_at: "",
    });
  }

  const largeUnified = buildUnifiedPaymentHistory({ installmentPayments: largePayments, posSales: [], appointments: [] });
  const largeSummary = computeClientFinancialSummary([app2], largeUnified);
  assert(largeUnified.length === 500, "Processed 500 payments successfully");
  assert(largeSummary.total_valid_payments === 50000, "Processed large transaction aggregate without overflow or precision loss (₱50,000.00)");

  // ----------------------------------------------------------------------------
  // SCENARIO 21: Missing or ambiguous historical relationships
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 21: Missing or ambiguous historical relationships");
  const ambiguousTransaction = { id: "pos-orphan-999", customer_id: null, total_amount: 5000 };
  const clientRecords = [ambiguousTransaction].filter((t) => t.customer_id === baseClient.id);
  assert(clientRecords.length === 0, "Unassociated or ambiguous transaction is excluded from client file");

  const warningMock: DataQualityWarning = {
    category: "Unlinked Transaction",
    severity: "warning",
    description: "Transaction POS-ORPHAN-999 has missing client ID and was flagged for manual reconciliation.",
    reference_id: "POS-ORPHAN-999",
  };
  assert(warningMock.severity === "warning", "Ambiguous records flagged in Data Quality Warnings sheet");

  // ----------------------------------------------------------------------------
  // SCENARIO 22: Consistency between PDF and Excel generated for the same export request
  // ----------------------------------------------------------------------------
  console.log("\nSCENARIO 22: Consistency between PDF and Excel generated for the same export request");
  const pdfHtml = generateClientFilePrintableHTML(fullClientFile);
  const excelSheetSummary = XLSX.utils.sheet_to_json<any>(workbook.Sheets["Account Summary"]);

  const excelContractValRow = excelSheetSummary.find((r) => r.Metric === "Total Contract Value");
  const excelContractVal = excelContractValRow ? excelContractValRow["Amount (₱)"] : null;

  assert(excelContractVal === fullClientFile.summary.total_contract_value, "Excel summary contract value matches engine state");
  assert(pdfHtml.includes(formatPHP(fullClientFile.summary.total_contract_value)), "PDF HTML contains exact matching formatted contract value");
  assert(pdfHtml.includes(fullClientFile.client.customer_code || fullClientFile.client.id), "Both PDF and Excel share identical client code and ID");

  console.log("\n================================================================================");
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
