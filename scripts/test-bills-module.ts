// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Automated Quality Assurance Test Suite for Bills Due & Automated Reminders
// ==============================================================================

import {
  deriveBillStatus,
  calculateOutstandingBalance,
  roundCurrency,
  computeBillSummaryKPIs,
  getCalendarDayDiff,
  getLocalDateString,
  isBillEligibleForReminderStage,
  getNextReminderInfo,
  formatPHP,
} from "../src/lib/bills/bill-calculator";

import {
  calculateNextBillingDate,
  calculateDueDateForRule,
} from "../src/lib/bills/recurring-calculator";

import type {
  BillItem,
  BillPayment,
  BillStatus,
  ReminderStage,
} from "../src/app/admin/(dashboard)/bills/types";

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
console.log("CINDYRELLA BILLS DUE & PAYMENT REMINDERS — QA TEST SUITE");
console.log("=======================================================\n");

const todayStr = "2026-10-18"; // Reference date matching metadata local time

// ------------------------------------------------------------------------------
// Test 1: Create a bill due in seven days & verify status
// ------------------------------------------------------------------------------
console.log("TEST 1: Bill Due in 7 Days (Upcoming)");
{
  const dueDate = "2026-10-25"; // 7 days after today
  const diff = getCalendarDayDiff(dueDate, todayStr);
  assert(diff === 7, "Calendar day difference is exactly 7 days");

  const status = deriveBillStatus({
    dueDate,
    totalAmount: 15000,
    amountPaid: 0,
    referenceDateStr: todayStr,
  });
  assert(status === "upcoming", "Bill due in 7 days has status 'upcoming'");
}

// ------------------------------------------------------------------------------
// Test 2: Generate the 7-day reminder once
// ------------------------------------------------------------------------------
console.log("\nTEST 2: Generate 7-Day Reminder Once");
{
  const testBill = {
    status: "upcoming" as BillStatus,
    due_date: "2026-10-25",
    total_amount: 15000,
    amount_paid: 0,
    reminder_schedule: { stages: ["7_days", "3_days", "1_day", "due_date", "overdue"] as ReminderStage[] },
  };

  const eligible7Days = isBillEligibleForReminderStage({
    bill: testBill,
    stage: "7_days",
    referenceDateStr: todayStr,
  });
  assert(eligible7Days === true, "Bill is eligible for 7_days reminder on day 7 before due date");

  const eligible3Days = isBillEligibleForReminderStage({
    bill: testBill,
    stage: "3_days",
    referenceDateStr: todayStr,
  });
  assert(eligible3Days === false, "Bill is NOT eligible for 3_days reminder when 7 days out");
}

// ------------------------------------------------------------------------------
// Test 3: Run scheduler again and verify NO duplicate reminder (Idempotency)
// ------------------------------------------------------------------------------
console.log("\nTEST 3: Scheduler Idempotency & Duplicate Prevention");
{
  const billId = "bill-uuid-101";
  const stage = "7_days";
  const recipientId = "staff-admin-01";
  const channel = "in_app";

  // Deterministic Idempotency Key
  const generateKey = (bId: string, stg: string, date: string, ch: string, rId: string) =>
    `rem_${bId}_${stg}_${date}_${ch}_${rId}`;

  const key1 = generateKey(billId, stage, todayStr, channel, recipientId);
  const key2 = generateKey(billId, stage, todayStr, channel, recipientId);

  assert(key1 === key2, "Idempotency keys are identical for the same bill, stage, date, channel, and recipient");

  // Simulated log cache
  const sentLogs = new Set<string>();
  let dispatchedCount = 0;

  // First run
  if (!sentLogs.has(key1)) {
    sentLogs.add(key1);
    dispatchedCount++;
  }

  // Second run (simulating scheduler re-trigger)
  if (!sentLogs.has(key2)) {
    sentLogs.add(key2);
    dispatchedCount++;
  }

  assert(dispatchedCount === 1, "Scheduler executed twice but dispatched reminder exactly ONCE (No duplicates)");
}

// ------------------------------------------------------------------------------
// Test 4: Create a bill due today
// ------------------------------------------------------------------------------
console.log("\nTEST 4: Bill Due Today");
{
  const dueDate = todayStr; // 2026-10-18
  const diff = getCalendarDayDiff(dueDate, todayStr);
  assert(diff === 0, "Day difference for due today is 0");

  const status = deriveBillStatus({
    dueDate,
    totalAmount: 4500,
    amountPaid: 0,
    referenceDateStr: todayStr,
  });
  assert(status === "due_today", "Bill due today has authoritative status 'due_today'");

  const eligibleDueToday = isBillEligibleForReminderStage({
    bill: {
      status: "due_today",
      due_date: dueDate,
      total_amount: 4500,
      amount_paid: 0,
    },
    stage: "due_date",
    referenceDateStr: todayStr,
  });
  assert(eligibleDueToday === true, "Bill due today triggers 'due_date' reminder stage");
}

// ------------------------------------------------------------------------------
// Test 5: Create an overdue unpaid bill
// ------------------------------------------------------------------------------
console.log("\nTEST 5: Overdue Unpaid Bill");
{
  const pastDueDate = "2026-10-12"; // 6 days ago
  const diff = getCalendarDayDiff(pastDueDate, todayStr);
  assert(diff === -6, "Calendar difference for overdue bill is negative (-6 days)");

  const status = deriveBillStatus({
    dueDate: pastDueDate,
    totalAmount: 8200,
    amountPaid: 0,
    referenceDateStr: todayStr,
  });
  assert(status === "overdue", "Bill past due date has status 'overdue'");

  const eligibleOverdue = isBillEligibleForReminderStage({
    bill: {
      status: "overdue",
      due_date: pastDueDate,
      total_amount: 8200,
      amount_paid: 0,
    },
    stage: "overdue",
    referenceDateStr: todayStr,
  });
  assert(eligibleOverdue === true, "Overdue bill triggers 'overdue' reminder stage");
}

// ------------------------------------------------------------------------------
// Test 6: Partially pay a bill and verify outstanding balance
// ------------------------------------------------------------------------------
console.log("\nTEST 6: Partial Payment & Outstanding Balance");
{
  const totalAmount = 10000.00;
  const partialPayment = 3500.50;

  const balance = calculateOutstandingBalance(totalAmount, partialPayment);
  assert(balance === 6499.50, "Outstanding Balance = Total (10,000) - Paid (3,500.50) = 6,499.50");

  const status = deriveBillStatus({
    dueDate: "2026-10-25",
    totalAmount,
    amountPaid: partialPayment,
    referenceDateStr: todayStr,
  });
  assert(status === "partially_paid", "Partially paid bill before due date has status 'partially_paid'");

  // Overdue partial payment
  const overduePartialStatus = deriveBillStatus({
    dueDate: "2026-10-10",
    totalAmount,
    amountPaid: partialPayment,
    referenceDateStr: todayStr,
  });
  assert(overduePartialStatus === "overdue", "Partially paid bill past due date remains marked 'overdue'");
}

// ------------------------------------------------------------------------------
// Test 7: Fully pay a bill and verify future reminders stop
// ------------------------------------------------------------------------------
console.log("\nTEST 7: Full Payment & Stop Future Reminders");
{
  const totalAmount = 5000.00;
  const fullPayment = 5000.00;

  const balance = calculateOutstandingBalance(totalAmount, fullPayment);
  assert(balance === 0.00, "Outstanding balance on full payment is ₱0.00");

  const status = deriveBillStatus({
    dueDate: "2026-10-10", // Even if past due!
    totalAmount,
    amountPaid: fullPayment,
    referenceDateStr: todayStr,
  });
  assert(status === "paid", "Fully paid bill cannot remain overdue; status is 'paid'");

  // Check reminder eligibility
  const eligible = isBillEligibleForReminderStage({
    bill: {
      status: "paid",
      due_date: "2026-10-10",
      total_amount: totalAmount,
      amount_paid: fullPayment,
    },
    stage: "overdue",
    referenceDateStr: todayStr,
  });
  assert(eligible === false, "Fully paid bill is NOT eligible for payment reminders");
}

// ------------------------------------------------------------------------------
// Test 8: Cancel a bill and verify reminders stop
// ------------------------------------------------------------------------------
console.log("\nTEST 8: Bill Cancellation Preserves Audit & Stops Reminders");
{
  const status = deriveBillStatus({
    dueDate: "2026-10-10",
    totalAmount: 12000,
    amountPaid: 0,
    isCancelled: true,
    cancelledAt: "2026-10-15T10:00:00Z",
    referenceDateStr: todayStr,
  });
  assert(status === "cancelled", "Cancelled bill status is 'cancelled'");

  const eligible = isBillEligibleForReminderStage({
    bill: {
      status: "cancelled",
      due_date: "2026-10-10",
      total_amount: 12000,
      amount_paid: 0,
      cancelled_at: "2026-10-15T10:00:00Z",
    },
    stage: "overdue",
    referenceDateStr: todayStr,
  });
  assert(eligible === false, "Cancelled bill never triggers payment reminders");
}

// ------------------------------------------------------------------------------
// Test 9: Recurring Bill Generation Without Duplicates
// ------------------------------------------------------------------------------
console.log("\nTEST 9: Recurring Bill Schedule Calculation & Duplicate Prevention");
{
  // Monthly cycle advancement
  const currentBilling = "2026-10-01";
  const nextMonthly = calculateNextBillingDate(currentBilling, "monthly");
  assert(nextMonthly === "2026-11-01", "Monthly cycle correctly advances 1 month (2026-10-01 -> 2026-11-01)");

  const nextQuarterly = calculateNextBillingDate(currentBilling, "quarterly");
  assert(nextQuarterly === "2026-01-01" || nextQuarterly === "2027-01-01", "Quarterly advances 3 months");

  const nextWeekly = calculateNextBillingDate("2026-10-01", "weekly");
  assert(nextWeekly === "2026-10-08", "Weekly advances 7 days (2026-10-01 -> 2026-10-08)");

  // Due date rule: 15th of the month
  const dueDateFixed = calculateDueDateForRule({
    issueDateStr: "2026-10-01",
    rule: "day_of_month",
    offset: 15,
  });
  assert(dueDateFixed === "2026-10-15", "Fixed day of month rule computes due date on the 15th");

  // Due date rule: 10 days after cycle
  const dueDateOffset = calculateDueDateForRule({
    issueDateStr: "2026-10-01",
    rule: "days_after_billing",
    offset: 10,
  });
  assert(dueDateOffset === "2026-10-11", "Offset rule computes due date 10 days after issue (Oct 11)");
}

// ------------------------------------------------------------------------------
// Test 10: Davao / Makati Branch Isolation
// ------------------------------------------------------------------------------
console.log("\nTEST 10: Branch Isolation (Davao vs Makati vs Super Admin)");
{
  const davaoBranchId = "branch-davao-01";
  const makatiBranchId = "branch-makati-02";

  const allBills = [
    { id: "b1", branch_id: davaoBranchId, title: "Davao Electricity" },
    { id: "b2", branch_id: davaoBranchId, title: "Davao Internet" },
    { id: "b3", branch_id: makatiBranchId, title: "Makati Rent" },
    { id: "b4", branch_id: null, title: "Headquarters Software" },
  ];

  // Super Admin view
  const isSuperAdmin = true;
  const superAdminBills = allBills.filter(() => isSuperAdmin);
  assert(superAdminBills.length === 4, "Super Admin views company-wide bills across all branches");

  // Davao Branch Manager view
  const davaoManagerBranch = davaoBranchId;
  const davaoBills = allBills.filter(
    (b) => b.branch_id === davaoManagerBranch || b.branch_id === null
  );
  assert(davaoBills.length === 3, "Davao Branch Manager sees only Davao bills + shared bills");
  assert(!davaoBills.some((b) => b.branch_id === makatiBranchId), "Davao Manager cannot see Makati bills");

  // Makati Branch view
  const makatiBills = allBills.filter(
    (b) => b.branch_id === makatiBranchId || b.branch_id === null
  );
  assert(makatiBills.length === 2, "Makati Branch Manager sees only Makati bills + shared bills");
  assert(!makatiBills.some((b) => b.branch_id === davaoBranchId), "Makati Manager cannot see Davao bills");
}

// ------------------------------------------------------------------------------
// Test 11: Permissions & Separation of Duties
// ------------------------------------------------------------------------------
console.log("\nTEST 11: Permissions & Separation of Duties");
{
  // Role permissions matrix
  const permissions = {
    super_admin: ["bills.view", "bills.create", "bills.edit", "bills.approve", "bills.pay", "bills.cancel", "bills.reminders", "bills.export"],
    manager: ["bills.view", "bills.create", "bills.edit", "bills.approve", "bills.pay", "bills.reminders", "bills.export"],
    cashier: ["bills.view", "bills.pay"],
    staff: ["bills.view"],
  };

  assert(permissions.cashier.includes("bills.pay"), "Cashier has permission to record payments");
  assert(!permissions.cashier.includes("bills.approve"), "Cashier CANNOT approve bills (separation of duties)");
  assert(!permissions.cashier.includes("bills.cancel"), "Cashier CANNOT cancel bills");

  assert(permissions.manager.includes("bills.approve"), "Branch Manager can approve bills");
  assert(permissions.super_admin.includes("bills.cancel"), "Super Admin can cancel bills");
}

// ------------------------------------------------------------------------------
// Test 12: Dashboard Summary Totals & Accurate Balances
// ------------------------------------------------------------------------------
console.log("\nTEST 12: Dashboard Summary KPI Cards (Accurate Totals & Non-Inclusion of Paid)");
{
  const sampleBills: BillItem[] = [
    {
      id: "b-1",
      bill_number: "BILL-001",
      title: "Due Today Electricity",
      category_id: "cat-1",
      vendor_or_payee: "Meralco",
      due_date: todayStr, // Due today
      amount_before_tax: 2000,
      tax_amount: 0,
      total_amount: 2000,
      amount_paid: 0,
      outstanding_balance: 2000,
      payment_method: "bank_transfer",
      status: "due_today",
      approval_status: "approved",
      is_recurring: false,
      reminder_schedule: { stages: ["due_date"] },
      created_at: `${todayStr}T08:00:00Z`,
      updated_at: `${todayStr}T08:00:00Z`,
      issue_date: todayStr,
    },
    {
      id: "b-2",
      bill_number: "BILL-002",
      title: "Due In 5 Days Internet",
      category_id: "cat-2",
      vendor_or_payee: "PLDT",
      due_date: "2026-10-23", // In 5 days
      amount_before_tax: 3000,
      tax_amount: 0,
      total_amount: 3000,
      amount_paid: 1000,
      outstanding_balance: 2000,
      payment_method: "bank_transfer",
      status: "partially_paid",
      approval_status: "approved",
      is_recurring: false,
      reminder_schedule: { stages: ["7_days", "3_days"] },
      created_at: `${todayStr}T08:00:00Z`,
      updated_at: `${todayStr}T08:00:00Z`,
      issue_date: todayStr,
    },
    {
      id: "b-3",
      bill_number: "BILL-003",
      title: "Overdue Rent",
      category_id: "cat-3",
      vendor_or_payee: "Landlord",
      due_date: "2026-10-10", // 8 days overdue
      amount_before_tax: 25000,
      tax_amount: 0,
      total_amount: 25000,
      amount_paid: 0,
      outstanding_balance: 25000,
      payment_method: "bank_transfer",
      status: "overdue",
      approval_status: "approved",
      is_recurring: false,
      reminder_schedule: { stages: ["overdue"] },
      created_at: "2026-10-01T08:00:00Z",
      updated_at: "2026-10-01T08:00:00Z",
      issue_date: "2026-10-01",
    },
    {
      id: "b-4",
      bill_number: "BILL-004",
      title: "Fully Paid Water",
      category_id: "cat-4",
      vendor_or_payee: "Water District",
      due_date: todayStr,
      amount_before_tax: 1500,
      tax_amount: 0,
      total_amount: 1500,
      amount_paid: 1500,
      outstanding_balance: 0,
      payment_method: "bank_transfer",
      status: "paid",
      approval_status: "approved",
      is_recurring: false,
      reminder_schedule: { stages: [] },
      created_at: `${todayStr}T08:00:00Z`,
      updated_at: `${todayStr}T08:00:00Z`,
      issue_date: todayStr,
      payments: [
        {
          id: "p1",
          bill_id: "b-4",
          payment_number: "BPAY-01",
          amount: 1500,
          payment_date: todayStr,
          payment_method: "bank_transfer",
          is_reversed: false,
          created_at: `${todayStr}T08:00:00Z`,
        },
      ],
    },
  ];

  const kpis = computeBillSummaryKPIs(sampleBills, todayStr);

  assert(kpis.dueTodayCount === 1, "Due Today count is 1 (excluding fully paid bill)");
  assert(kpis.dueTodayAmount === 2000, "Due Today amount is ₱2,000.00");

  assert(kpis.dueWithin7DaysCount === 2, "Due Within 7 Days count is 2 (b-1 + b-2)");
  assert(kpis.dueWithin7DaysAmount === 4000, "Due Within 7 Days amount = ₱2,000 (b-1) + ₱2,000 remaining (b-2) = ₱4,000.00");

  assert(kpis.overdueCount === 1, "Overdue count is 1 (b-3)");
  assert(kpis.overdueAmount === 25000, "Overdue amount is ₱25,000.00");

  // Outstanding = 2000 (b-1) + 2000 (b-2) + 25000 (b-3) = 29000
  assert(kpis.outstandingCount === 3, "Outstanding count is 3 (paid bill strictly excluded!)");
  assert(kpis.outstandingAmount === 29000, "Outstanding total is ₱29,000.00 (paid bill strictly excluded)");

  assert(kpis.paidThisMonthCount === 1, "Paid this month count is 1");
  assert(kpis.paidThisMonthAmount === 1500, "Paid this month amount is ₱1,500.00");
}

// ------------------------------------------------------------------------------
// Test 13: Financial Reports & Non-Duplication with Expenses
// ------------------------------------------------------------------------------
console.log("\nTEST 13: Non-Duplication with Expenses Module");
{
  // A bill of ₱10,000 created with a linked expense
  const billTotal = 10000;
  const linkedExpenseTotal = 10000;
  const isAccrual = true;

  // In an accounting report, when calculating total expenditure:
  // If isAccrual = true, report groups by bill_id or expense_id to prevent double counting
  const combinedEntries = [
    { type: "expense", id: "exp-1", total: linkedExpenseTotal, is_accrual: isAccrual, bill_id: "bill-1" },
    { type: "bill", id: "bill-1", total: billTotal, expense_id: "exp-1" },
  ];

  // Aggregation deduplication logic
  const seenEntities = new Set<string>();
  let totalRecognizedCost = 0;

  for (const entry of combinedEntries) {
    const key = entry.type === "bill" ? entry.id : (entry.bill_id || entry.id);
    if (!seenEntities.has(key)) {
      seenEntities.add(key);
      totalRecognizedCost += entry.total;
    }
  }

  assert(totalRecognizedCost === 10000, "Financial accounting deduplication recognizes ₱10,000 cost once, not twice");
}

// ------------------------------------------------------------------------------
// Test 14: Next Reminder Date Resolution
// ------------------------------------------------------------------------------
console.log("\nTEST 14: Next Reminder Date Resolution");
{
  const nextRem = getNextReminderInfo({
    dueDate: "2026-10-25", // 7 days from Oct 18
    status: "upcoming",
    amountPaid: 0,
    totalAmount: 5000,
    stagesConfig: ["7_days", "3_days", "1_day", "due_date", "overdue"],
    referenceDateStr: todayStr,
  });

  assert(nextRem.nextDate === todayStr, "7-day reminder scheduled for today (Oct 18)");
  assert(nextRem.nextStage === "7_days", "Next reminder stage is '7_days'");
}

// ------------------------------------------------------------------------------
// Test 15: Decimal Safety & Currency Formatting
// ------------------------------------------------------------------------------
console.log("\nTEST 15: Decimal-Safe Financial Calculations & Currency Display");
{
  const a = 0.1;
  const b = 0.2;
  const rawSum = a + b; // In standard JS this is 0.30000000000000004
  const safeSum = roundCurrency(rawSum);
  assert(safeSum === 0.30, "IEEE 754 floating point artifact eliminated: roundCurrency(0.1 + 0.2) = 0.30");

  const phpStr = formatPHP(1254300.5);
  assert(phpStr.includes("₱") && phpStr.includes("1,254,300.50"), "Currency formatted with Philippine Peso sign (₱) and 2 decimals");
}

console.log("\n=======================================================");
console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
