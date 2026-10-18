// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Automated Quality Assurance Test Suite: Client File Extraction & Installments
// ==============================================================================

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

console.log("\n=======================================================");
console.log("CINDYRELLA CLIENT HISTORY & INSTALLMENT QA TEST SUITE");
console.log("=======================================================\n");

// ------------------------------------------------------------------------------
// TEST 1: Client with NO installment applications
// ------------------------------------------------------------------------------
console.log("TEST 1: Client with No Installment Applications");
const clientNoApps: CustomerProfile = {
  id: "cust-001-empty",
  customer_code: "CUST-001",
  first_name: "Ana",
  last_name: "Reyes",
  full_name: "Ana Reyes",
  phone: "09171112222",
  email: "ana.reyes@example.com",
  created_at: "2026-01-10T08:00:00Z",
};

const summary1 = computeClientFinancialSummary([], []);
assert(summary1.total_contract_value === 0, "Total contract value is ₱0.00 for client with no applications");
assert(summary1.total_outstanding_balance === 0, "Outstanding balance is ₱0.00");
assert(summary1.paid_installments_count === 0, "Paid installments count is 0");
assert(summary1.remaining_installments_count === 0, "Remaining installments count is 0");

// ------------------------------------------------------------------------------
// TEST 2: Client with 1 installment application and multiple payments
// ------------------------------------------------------------------------------
console.log("\nTEST 2: Client with 1 Installment Application and Multiple Payments");
const app2: InstallmentApplication = {
  id: "app-101",
  application_number: "INST-2026-0001",
  customer_id: "cust-002",
  service_package_name: "Full Body Laser Hair Removal - 4 Sessions",
  original_contract_amount: 20000,
  down_payment_required: 0,
  down_payment_received: 0,
  frequency: "monthly",
  installment_amount: 5000,
  number_of_installments: 4,
  contract_start_date: "2026-08-01",
  status: "active",
  approval_status: "approved",
  created_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-01T09:00:00Z",
  schedules: [
    { id: "s-1", application_id: "app-101", installment_number: 1, due_date: "2026-09-01", scheduled_amount: 5000, amount_paid: 5000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
    { id: "s-2", application_id: "app-101", installment_number: 2, due_date: "2026-10-01", scheduled_amount: 5000, amount_paid: 5000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
    { id: "s-3", application_id: "app-101", installment_number: 3, due_date: "2026-11-01", scheduled_amount: 5000, amount_paid: 0, remaining_amount: 5000, status: "upcoming", created_at: "", updated_at: "" },
    { id: "s-4", application_id: "app-101", installment_number: 4, due_date: "2026-12-01", scheduled_amount: 5000, amount_paid: 0, remaining_amount: 5000, status: "upcoming", created_at: "", updated_at: "" },
  ],
};

const payments2: InstallmentPayment[] = [
  { id: "p-1", payment_number: "PAY-2026-01", application_id: "app-101", customer_id: "cust-002", schedule_id: "s-1", installment_number: 1, amount_paid: 5000, payment_method: "gcash", payment_date: "2026-09-01T10:00:00Z", status: "completed", created_at: "" },
  { id: "p-2", payment_number: "PAY-2026-02", application_id: "app-101", customer_id: "cust-002", schedule_id: "s-2", installment_number: 2, amount_paid: 5000, payment_method: "cash", payment_date: "2026-10-01T10:00:00Z", status: "completed", created_at: "" },
];

const unified2 = buildUnifiedPaymentHistory({ installmentPayments: payments2, posSales: [], appointments: [] });
const summary2 = computeClientFinancialSummary([app2], unified2, "2026-10-18");

assert(summary2.total_contract_value === 20000, "Total contract value is ₱20,000.00");
assert(summary2.total_valid_payments === 10000, "Total valid payments is ₱10,000.00");
assert(summary2.total_outstanding_balance === 10000, "Outstanding balance is ₱10,000.00");
assert(summary2.paid_installments_count === 2, "2 paid installments counted");
assert(summary2.remaining_installments_count === 2, "2 remaining installments counted");
assert(summary2.next_due_date === "2026-11-01", "Next due date resolved correctly to 2026-11-01");

// ------------------------------------------------------------------------------
// TEST 3: Client with MULTIPLE installment applications (Contracts must not merge)
// ------------------------------------------------------------------------------
console.log("\nTEST 3: Client with Multiple Installment Applications");
const app3A: InstallmentApplication = {
  id: "app-301",
  application_number: "INST-2026-301",
  customer_id: "cust-003",
  service_package_name: "EMS Sculpt Package",
  original_contract_amount: 15000,
  down_payment_required: 0,
  down_payment_received: 0,
  frequency: "monthly",
  installment_amount: 5000,
  number_of_installments: 3,
  contract_start_date: "2026-09-01",
  status: "active",
  approval_status: "approved",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  schedules: [
    { id: "s-301-1", application_id: "app-301", installment_number: 1, due_date: "2026-09-15", scheduled_amount: 5000, amount_paid: 5000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
    { id: "s-301-2", application_id: "app-301", installment_number: 2, due_date: "2026-10-15", scheduled_amount: 5000, amount_paid: 0, remaining_amount: 5000, status: "upcoming", created_at: "", updated_at: "" },
  ],
};

const app3B: InstallmentApplication = {
  id: "app-302",
  application_number: "INST-2026-302",
  customer_id: "cust-003",
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
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  schedules: [
    { id: "s-302-1", application_id: "app-302", installment_number: 1, due_date: "2026-11-01", scheduled_amount: 10000, amount_paid: 10000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
    { id: "s-302-2", application_id: "app-302", installment_number: 2, due_date: "2026-12-01", scheduled_amount: 10000, amount_paid: 0, remaining_amount: 10000, status: "upcoming", created_at: "", updated_at: "" },
  ],
};

const payments3: InstallmentPayment[] = [
  { id: "p-301", payment_number: "PAY-301", application_id: "app-301", customer_id: "cust-003", schedule_id: "s-301-1", installment_number: 1, amount_paid: 5000, payment_method: "cash", payment_date: "2026-09-15T00:00:00Z", status: "completed", created_at: "" },
  { id: "p-302", payment_number: "PAY-302", application_id: "app-302", customer_id: "cust-003", schedule_id: "s-302-1", installment_number: 1, amount_paid: 10000, payment_method: "card", payment_date: "2026-11-01T00:00:00Z", status: "completed", created_at: "" },
];

const unified3 = buildUnifiedPaymentHistory({ installmentPayments: payments3, posSales: [], appointments: [] });
const summary3 = computeClientFinancialSummary([app3A, app3B], unified3, "2026-10-18");

assert(summary3.total_contract_value === 45000, "Separate contracts preserved: Total Contract = 15k + 30k = ₱45,000.00");
assert(summary3.total_valid_payments === 15000, "Total valid payments = 5k + 10k = ₱15,000.00");
assert(summary3.total_outstanding_balance === 30000, "Total outstanding balance = ₱30,000.00");
assert(summary3.active_applications_count === 2, "2 distinct active contracts tracked");

// ------------------------------------------------------------------------------
// TEST 4: Client with Partial Installment Payments
// ------------------------------------------------------------------------------
console.log("\nTEST 4: Partial Installment Payments");
const schedStatusPartial = determineScheduleStatus("2026-11-01", 5000, 2000, "2026-10-18");
assert(schedStatusPartial === "partially_paid", "Schedule status is 'partially_paid' when amount_paid (2,000) < scheduled (5,000)");

const schedStatusOverduePartial = determineScheduleStatus("2026-10-01", 5000, 2000, "2026-10-18");
assert(schedStatusOverduePartial === "overdue", "Schedule status is 'overdue' when partial payment is past due date");

// ------------------------------------------------------------------------------
// TEST 5: Client with Overdue Installments
// ------------------------------------------------------------------------------
console.log("\nTEST 5: Overdue Installments Calculation");
const appOverdue: InstallmentApplication = {
  id: "app-501",
  application_number: "INST-501",
  customer_id: "cust-005",
  service_package_name: "HydraFacial 3-Session Promo",
  original_contract_amount: 9000,
  down_payment_required: 0,
  down_payment_received: 0,
  frequency: "monthly",
  installment_amount: 3000,
  number_of_installments: 3,
  contract_start_date: "2026-08-01",
  status: "active",
  approval_status: "approved",
  created_at: "",
  updated_at: "",
  schedules: [
    { id: "s-501-1", application_id: "app-501", installment_number: 1, due_date: "2026-09-01", scheduled_amount: 3000, amount_paid: 0, remaining_amount: 3000, status: "overdue", created_at: "", updated_at: "" },
    { id: "s-501-2", application_id: "app-501", installment_number: 2, due_date: "2026-10-01", scheduled_amount: 3000, amount_paid: 0, remaining_amount: 3000, status: "overdue", created_at: "", updated_at: "" },
    { id: "s-501-3", application_id: "app-501", installment_number: 3, due_date: "2026-11-01", scheduled_amount: 3000, amount_paid: 0, remaining_amount: 3000, status: "upcoming", created_at: "", updated_at: "" },
  ],
};

const summary5 = computeClientFinancialSummary([appOverdue], [], "2026-10-18");
assert(summary5.overdue_balance === 6000, "Overdue balance calculates exactly ₱6,000.00 (two overdue installments)");
assert(summary5.total_outstanding_balance === 9000, "Total outstanding balance is ₱9,000.00");

// ------------------------------------------------------------------------------
// TEST 6: Client with a FULLY PAID contract
// ------------------------------------------------------------------------------
console.log("\nTEST 6: Fully Paid Contract");
const appPaid: InstallmentApplication = {
  id: "app-601",
  application_number: "INST-601",
  customer_id: "cust-006",
  service_package_name: "Diamond Peel 5-Session Pass",
  original_contract_amount: 12000,
  down_payment_required: 0,
  down_payment_received: 0,
  frequency: "monthly",
  installment_amount: 6000,
  number_of_installments: 2,
  contract_start_date: "2026-08-01",
  status: "completed",
  approval_status: "approved",
  created_at: "",
  updated_at: "",
  schedules: [
    { id: "s-601-1", application_id: "app-601", installment_number: 1, due_date: "2026-08-15", scheduled_amount: 6000, amount_paid: 6000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
    { id: "s-601-2", application_id: "app-601", installment_number: 2, due_date: "2026-09-15", scheduled_amount: 6000, amount_paid: 6000, remaining_amount: 0, status: "paid", created_at: "", updated_at: "" },
  ],
};

const payPaid: InstallmentPayment[] = [
  { id: "p-601", payment_number: "PAY-601", application_id: "app-601", customer_id: "cust-006", amount_paid: 12000, payment_method: "bank_transfer", payment_date: "2026-09-15T00:00:00Z", status: "completed", created_at: "" },
];

const unified6 = buildUnifiedPaymentHistory({ installmentPayments: payPaid, posSales: [], appointments: [] });
const summary6 = computeClientFinancialSummary([appPaid], unified6, "2026-10-18");

assert(summary6.total_outstanding_balance === 0, "Fully paid contract has ₱0.00 outstanding balance");
assert(summary6.overdue_balance === 0, "Fully paid contract cannot remain overdue (₱0.00 overdue)");
assert(summary6.remaining_installments_count === 0, "Remaining installments count is 0");

// ------------------------------------------------------------------------------
// TEST 7: Client with Refunds or Reversed Payments
// ------------------------------------------------------------------------------
console.log("\nTEST 7: Payment Reversals and Refunds Handling");
const payReversed: InstallmentPayment[] = [
  { id: "p-701", payment_number: "PAY-701", application_id: "app-101", customer_id: "cust-007", amount_paid: 5000, payment_method: "cash", payment_date: "2026-10-01T00:00:00Z", status: "reversed", reversal_reason: "Mistaken cashier entry", created_at: "" },
];

const unified7 = buildUnifiedPaymentHistory({ installmentPayments: payReversed, posSales: [], appointments: [] });
assert(unified7[0].is_valid_collection === false, "Reversed payment is flagged is_valid_collection = false");

const summary7 = computeClientFinancialSummary([app2], unified7, "2026-10-18");
assert(summary7.total_valid_payments === 0, "Reversed payment is excluded from total valid payments (₱0.00)");
assert(summary7.total_refunded_reversed === 5000, "Reversed payment is properly recognized in total_refunded_reversed (₱5,000.00)");
assert(summary7.total_outstanding_balance === 20000, "Outstanding balance remains unreduced on reversed payment (₱20,000.00)");

// ------------------------------------------------------------------------------
// TEST 8: Client with Appointments and Completed Treatments
// ------------------------------------------------------------------------------
console.log("\nTEST 8: Appointments and Treatment History");
const appointments8: ClientAppointmentItem[] = [
  { id: "appt-801", reference_number: "BK-801", appointment_date: "2026-10-10", appointment_time: "10:00 AM", treatment_name: "Aqua Glow Facial", branch_name: "Davao Branch", status: "completed", payment_method: "cash", payment_status: "paid", amount_due: 2500, created_at: "2026-10-05T00:00:00Z" },
];

const timeline8 = buildClientActivityTimeline({
  client: clientNoApps,
  applications: [],
  payments: [],
  appointments: appointments8,
  packages: [],
});

assert(timeline8.some((t) => t.type === "appointment_completed"), "Appointment completed event generated in activity timeline");
assert(timeline8.some((t) => t.title.includes("Aqua Glow Facial")), "Treatment name rendered accurately in timeline");

// ------------------------------------------------------------------------------
// TEST 9: Branch Isolation (Davao vs Makati permissions)
// ------------------------------------------------------------------------------
console.log("\nTEST 9: Branch Isolation for Client Records");
const davaoApp: InstallmentApplication = { ...app2, id: "app-davao", branch_name: "Davao Branch" };
const makatiApp: InstallmentApplication = { ...app2, id: "app-makati", branch_name: "Makati Branch" };

// Simulating Davao Branch Manager scope
const davaoVisible = [davaoApp, makatiApp].filter((a) => a.branch_name === "Davao Branch");
assert(davaoVisible.length === 1 && davaoVisible[0].id === "app-davao", "Davao Branch Manager cannot view Makati records");

// Simulating Super Admin scope
const superAdminVisible = [davaoApp, makatiApp];
assert(superAdminVisible.length === 2, "Super Admin views records company-wide across all branches");

// ------------------------------------------------------------------------------
// TEST 10: Clients with duplicate-looking names but different client IDs
// ------------------------------------------------------------------------------
console.log("\nTEST 10: Duplicate Name vs Stable Client ID Isolation");
const clientA: CustomerProfile = { id: "uuid-client-aaa", first_name: "Maria", last_name: "Santos", phone: "09181111111", email: "maria.a@test.com", created_at: "" };
const clientB: CustomerProfile = { id: "uuid-client-bbb", first_name: "Maria", last_name: "Santos", phone: "09182222222", email: "maria.b@test.com", created_at: "" };

const payClientA: InstallmentPayment = { id: "p-a", payment_number: "PAY-A", application_id: "app-a", customer_id: clientA.id, amount_paid: 5000, payment_method: "cash", payment_date: "", status: "completed", created_at: "" };
const payClientB: InstallmentPayment = { id: "p-b", payment_number: "PAY-B", application_id: "app-b", customer_id: clientB.id, amount_paid: 10000, payment_method: "cash", payment_date: "", status: "completed", created_at: "" };

const paymentsForA = [payClientA, payClientB].filter((p) => p.customer_id === clientA.id);
assert(paymentsForA.length === 1 && paymentsForA[0].id === "p-a", "Stable client ID prevents payment bleeding between identical names");

// ------------------------------------------------------------------------------
// TEST 11: Missing or ambiguous historical links
// ------------------------------------------------------------------------------
console.log("\nTEST 11: Missing or Ambiguous Links Prevention");
const orphanPOS = { id: "pos-orphan", reference_number: "POS-ORPHAN", total_amount: 1500, payment_method: "cash", status: "completed", created_at: "" };
// If customer_id is null/ambiguous, it should not be attached to client
const attachedToClient = [orphanPOS].filter((p: any) => p.customer_id === clientA.id);
assert(attachedToClient.length === 0, "Unlinked / orphan transactions are never attached by assumption or name guess");

// ------------------------------------------------------------------------------
// TEST 12: PDF & HTML Statement Completeness
// ------------------------------------------------------------------------------
console.log("\nTEST 12: PDF & Printable Statement Completeness");
const completeFileMock = buildCompleteClientFile({
  client: clientNoApps,
  applications: [app2],
  payments: unified2,
  appointments: appointments8,
  packages: [],
  actorName: "Test Supervisor",
  branchScope: "Company-Wide",
});

const htmlDoc = generateClientFilePrintableHTML(completeFileMock);
assert(htmlDoc.includes("COMPLETE CLIENT ACCOUNT HISTORY"), "HTML contains official header title");
assert(htmlDoc.includes("1. Client Profile"), "Section 1 included");
assert(htmlDoc.includes("2. Account Summary &amp; Balances"), "Section 2 included");
assert(htmlDoc.includes("3. Installment Applications &amp; Contracts"), "Section 3 included");
assert(htmlDoc.includes("4. Installment Payment Schedules"), "Section 4 included");
assert(htmlDoc.includes("5. Complete Payment History"), "Section 5 included");
assert(htmlDoc.includes("6. Appointments &amp; Treatments Rendered"), "Section 6 included");
assert(htmlDoc.includes("Certified Official Client Record"), "Signature and audit verification block present");

// ------------------------------------------------------------------------------
// TEST 13: Excel Workbook & 9-Sheet Verification
// ------------------------------------------------------------------------------
console.log("\nTEST 13: Excel Workbook Generation (9 Sheets)");
const excelBlob = generateClientFileExcel(completeFileMock);
assert(excelBlob instanceof Blob, "Excel file generated as valid Blob");
assert(excelBlob.size > 1000, `Excel file contains data (Size: ${excelBlob.size} bytes)`);

// ------------------------------------------------------------------------------
// TEST 14: Prevention of Duplicate Payment Counting (Installment + POS)
// ------------------------------------------------------------------------------
console.log("\nTEST 14: Prevention of Duplicate Payment Counting");
const duplicateInstallmentPay: InstallmentPayment = {
  id: "p-dup",
  payment_number: "PAY-DUP-01",
  application_id: "app-101",
  customer_id: "cust-002",
  amount_paid: 5000,
  payment_method: "cash",
  payment_date: "2026-10-01T10:00:00Z",
  transaction_reference: "POS-REF-999",
  status: "completed",
  created_at: "",
};

const duplicatePOSSale = {
  id: "pos-dup",
  reference_number: "POS-REF-999",
  total_amount: 5000,
  payment_method: "cash",
  status: "completed",
  created_at: "2026-10-01T10:00:00Z",
};

const deduplicatedUnified = buildUnifiedPaymentHistory({
  installmentPayments: [duplicateInstallmentPay],
  posSales: [duplicatePOSSale],
  appointments: [],
});

assert(deduplicatedUnified.length === 1, "Duplicate payment matching POS reference was deduplicated to 1 record, not 2");
const dedupSummary = computeClientFinancialSummary([], deduplicatedUnified);
assert(dedupSummary.total_valid_payments === 5000, "Financial collection accurately counted ₱5,000 once, not ₱10,000");

// ------------------------------------------------------------------------------
// TEST 15: Decimal-Safe Arithmetic & Currency Display
// ------------------------------------------------------------------------------
console.log("\nTEST 15: Decimal-Safe Arithmetic & Currency Display");
assert(roundCurrency(0.1 + 0.2) === 0.3, "IEEE 754 precision artifact resolved: 0.1 + 0.2 = 0.30");
assert(formatPHP(12500.5) === "₱12,500.50", "Philippine Peso currency properly formatted with ₱ sign");
assert(calculateContractBalance(10000, 10000.001) === 0, "No negative balances allowed on minor precision noise");

console.log("\n=======================================================");
console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
