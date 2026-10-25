// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Excel Workbook & Report Generator for Financial Statements
// ==============================================================================

import * as XLSX from "xlsx";
import type { IncomeStatementData, BalanceSheetData } from "./types";

/**
 * Generates a structured multi-worksheet Excel workbook containing the financial statements.
 */
export function generateFinancialStatementsExcel(
  income: IncomeStatementData,
  balanceSheet: BalanceSheetData
): Blob {
  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------------------------------
  // SHEET 1: Income Statement (Profit & Loss)
  // ----------------------------------------------------------------------------
  const isRows: Record<string, string | number>[] = [
    { "Section / Account": "CINDYRELLA AESTHETIC & WELLNESS CLINIC & SPA", "Amount (₱)": "", Notes: "" },
    { "Section / Account": "INCOME STATEMENT (STATEMENT OF PROFIT OR LOSS)", "Amount (₱)": "", Notes: "" },
    { "Section / Account": `Period: ${income.period.label} (${income.period.startDate} to ${income.period.endDate})`, "Amount (₱)": "", Notes: "" },
    { "Section / Account": `Branch Scope: ${income.branch.name}`, "Amount (₱)": "", Notes: "" },
    { "Section / Account": "", "Amount (₱)": "", Notes: "" },

    // REVENUE
    { "Section / Account": "I. REVENUE (GROSS SALES)", "Amount (₱)": "", Notes: "" },
    { "Section / Account": "  Service Revenue (Treatments & Bookings)", "Amount (₱)": income.revenue.serviceRevenue, Notes: "Completed & paid appointments" },
    { "Section / Account": "  Retail Product Revenue (POS Merchandise)", "Amount (₱)": income.revenue.retailProductRevenue, Notes: "Skin care & beauty products sold" },
    { "Section / Account": "  Package & Promo Sales", "Amount (₱)": income.revenue.packageRevenue, Notes: "Multi-session clinic service packages" },
    { "Section / Account": "  Client Installment Collections", "Amount (₱)": income.revenue.installmentCollections, Notes: "Downpayments and scheduled amortizations collected" },
    { "Section / Account": "TOTAL GROSS REVENUE", "Amount (₱)": income.revenue.grossRevenue, Notes: "Gross clinic revenue before discounts" },
    { "Section / Account": "  Less: Discounts & Promotional Deductions", "Amount (₱)": -income.revenue.discountsAndPromos, Notes: "Approved discounts & vouchers applied" },
    { "Section / Account": "  Less: Customer Refunds & Reversals", "Amount (₱)": -income.revenue.refundsAndReversals, Notes: "Voided & returned sales" },
    { "Section / Account": "NET REVENUE", "Amount (₱)": income.revenue.netRevenue, Notes: "Net income from operations" },
    { "Section / Account": "", "Amount (₱)": "", Notes: "" },

    // COGS
    { "Section / Account": "II. COST OF GOODS SOLD (COGS) / COST OF SERVICES", "Amount (₱)": "", Notes: "" },
    { "Section / Account": "  Medical Consumables & Treatment Materials", "Amount (₱)": income.cogs.treatmentMaterialsCost, Notes: "Supplies deducted per treatment recipe (BOM)" },
    { "Section / Account": "  Retail Products Wholesale Inventory Cost", "Amount (₱)": income.cogs.retailProductsWholesaleCost, Notes: "Acquisition cost of merchandise sold" },
    { "Section / Account": "  Direct Practitioner Commissions", "Amount (₱)": income.cogs.directPractitionerCommissions, Notes: "Treatment commissions paid" },
    { "Section / Account": "TOTAL COST OF GOODS SOLD", "Amount (₱)": income.cogs.totalCogs, Notes: "Direct cost of services rendered" },
    { "Section / Account": "", "Amount (₱)": "", Notes: "" },

    // GROSS PROFIT
    { "Section / Account": "GROSS PROFIT", "Amount (₱)": income.grossProfit, Notes: "Net Revenue less Cost of Goods Sold" },
    { "Section / Account": "Gross Profit Margin (%)", "Amount (₱)": `${income.grossProfitMargin.toFixed(2)}%`, Notes: "Gross Profit / Net Revenue" },
    { "Section / Account": "", "Amount (₱)": "", Notes: "" },

    // OPEX
    { "Section / Account": "III. OPERATING EXPENSES (OPEX)", "Amount (₱)": "", Notes: "" },
  ];

  income.operatingExpenses.byCategory.forEach(cat => {
    isRows.push({
      "Section / Account": `  ${cat.categoryName}`,
      "Amount (₱)": cat.amount,
      Notes: `${cat.count} approved voucher(s) (${cat.percentageOfOpex.toFixed(1)}% of OPEX)`,
    });
  });

  isRows.push(
    { "Section / Account": "  Staff Payroll & Salaries", "Amount (₱)": income.operatingExpenses.payrollSalaries, Notes: "Actual net disbursed payroll runs for the period" },
    { "Section / Account": "  Petty Cash & Cashier Drawer Disbursements", "Amount (₱)": income.operatingExpenses.pettyCashDisbursements, Notes: "Cash drops & clinic operational disbursements" },
    { "Section / Account": "TOTAL OPERATING EXPENSES", "Amount (₱)": income.operatingExpenses.totalOperatingExpenses, Notes: "Operational overhead & staff cost" },
    { "Section / Account": "", "Amount (₱)": "", Notes: "" },

    // OPERATING INCOME & NET PROFIT
    { "Section / Account": "OPERATING INCOME (EBITDA)", "Amount (₱)": income.operatingIncome, Notes: "Gross Profit less Operating Expenses" },
    { "Section / Account": "  Less: Taxes, Permits & Bank Charges", "Amount (₱)": -income.taxesAndOther, Notes: "Taxes and administrative fees" },
    { "Section / Account": "NET PROFIT / (NET LOSS) BEFORE TAX", "Amount (₱)": income.netProfit, Notes: "Bottom line clinic profitability" },
    { "Section / Account": "Net Profit Margin (%)", "Amount (₱)": `${income.netProfitMargin.toFixed(2)}%`, Notes: "Net Profit / Net Revenue" }
  );

  const wsIS = XLSX.utils.json_to_sheet(isRows);
  XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");

  // ----------------------------------------------------------------------------
  // SHEET 2: Balance Sheet
  // ----------------------------------------------------------------------------
  const bsRows: Record<string, string | number>[] = [
    { "Classification / Line Item": "CINDYRELLA AESTHETIC & WELLNESS CLINIC & SPA", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": `As of Date: ${balanceSheet.asOfDate}`, "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": `Branch Scope: ${balanceSheet.branch.name}`, "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "", "Amount (₱)": "", Notes: "" },

    // ASSETS
    { "Classification / Line Item": "ASSETS", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "Current Assets:", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "  Cash on Hand (Cashier Drawers)", "Amount (₱)": balanceSheet.assets.current.cashInDrawers, Notes: "Current active shift starting & collected drawer float" },
    { "Classification / Line Item": "  Petty Cash Funds", "Amount (₱)": balanceSheet.assets.current.pettyCashOnHand, Notes: "Current cash balance in petty cash vaults" },
    { "Classification / Line Item": "  Cash in Bank & Digital Wallets (GCash/Maya/Cards)", "Amount (₱)": balanceSheet.assets.current.cashInBankAndEWallets, Notes: "Digital sales settlements & bank transfers" },
    { "Classification / Line Item": "  Total Cash & Cash Equivalents", "Amount (₱)": balanceSheet.assets.current.totalCashAndEquivalents, Notes: "Subtotal: Highly liquid cash" },
    { "Classification / Line Item": "  Accounts Receivable: Client Installments", "Amount (₱)": balanceSheet.assets.current.accountsReceivable.clientInstallmentsReceivable, Notes: "Remaining contract balance to be amortized" },
    { "Classification / Line Item": "  Accounts Receivable: Invoiced Appointments", "Amount (₱)": balanceSheet.assets.current.accountsReceivable.unpaidAppointmentsReceivable, Notes: "Unpaid treatments rendered" },
    { "Classification / Line Item": "  Total Accounts Receivable", "Amount (₱)": balanceSheet.assets.current.accountsReceivable.totalAccountsReceivable, Notes: "Subtotal: Outstanding customer receivables" },
    { "Classification / Line Item": "  Inventory Asset: Medical Consumables & Serums", "Amount (₱)": balanceSheet.assets.current.inventoryAsset.medicalSuppliesValuation, Notes: "Clinic supplies on hand at cost" },
    { "Classification / Line Item": "  Inventory Asset: Retail Merchandise", "Amount (₱)": balanceSheet.assets.current.inventoryAsset.retailProductsValuation, Notes: "Beauty and wellness products at cost" },
    { "Classification / Line Item": "  Total Inventory Valuation", "Amount (₱)": balanceSheet.assets.current.inventoryAsset.totalInventoryValuation, Notes: `${balanceSheet.assets.current.inventoryAsset.totalSKUCount} active SKUs tracked` },
    { "Classification / Line Item": "  Prepaid Expenses & Advances", "Amount (₱)": balanceSheet.assets.current.prepaidExpenses, Notes: "Advance supplier deposits" },
    { "Classification / Line Item": "TOTAL CURRENT ASSETS", "Amount (₱)": balanceSheet.assets.current.totalCurrentAssets, Notes: "Liquid assets convertible within 1 year" },
    { "Classification / Line Item": "", "Amount (₱)": "", Notes: "" },

    // Non-Current Assets
    { "Classification / Line Item": "Non-Current Assets:", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "  Clinic Machinery, Lasers & Medical Equipment", "Amount (₱)": balanceSheet.assets.nonCurrent.clinicEquipmentAndMachinery, Notes: "IPL lasers, hydrafacial units, autoclaves" },
    { "Classification / Line Item": "  Leasehold Improvements & Clinic Furnishings", "Amount (₱)": balanceSheet.assets.nonCurrent.leaseholdImprovements, Notes: "Treatment room partitions, luxury interiors" },
    { "Classification / Line Item": "  Less: Accumulated Depreciation", "Amount (₱)": -balanceSheet.assets.nonCurrent.accumulatedDepreciation, Notes: "Standard contra-asset depreciation" },
    { "Classification / Line Item": "TOTAL NON-CURRENT ASSETS", "Amount (₱)": balanceSheet.assets.nonCurrent.netNonCurrentAssets, Notes: "Property, plant & equipment (Net PPE)" },
    { "Classification / Line Item": "TOTAL ASSETS", "Amount (₱)": balanceSheet.assets.totalAssets, Notes: "Current Assets + Non-Current Assets" },
    { "Classification / Line Item": "", "Amount (₱)": "", Notes: "" },

    // LIABILITIES
    { "Classification / Line Item": "LIABILITIES", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "Current Liabilities:", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "  Accounts Payable: Unpaid Supplier Bills", "Amount (₱)": balanceSheet.liabilities.current.accountsPayable.unpaidVendorBills, Notes: "Outstanding supplier invoices due" },
    { "Classification / Line Item": "  Accounts Payable: Approved Operational Vouchers", "Amount (₱)": balanceSheet.liabilities.current.accountsPayable.unpaidApprovedExpenses, Notes: "Reimbursements & vouchers due for payment" },
    { "Classification / Line Item": "  Total Accounts Payable", "Amount (₱)": balanceSheet.liabilities.current.accountsPayable.totalAccountsPayable, Notes: "Subtotal: Short term obligations" },
    { "Classification / Line Item": "  Accrued Payroll & Staff Salaries", "Amount (₱)": balanceSheet.liabilities.current.accruedPayrollPayable, Notes: "Pending payroll balances" },
    { "Classification / Line Item": "  Unearned Revenue (Customer Prepaid Deposits)", "Amount (₱)": balanceSheet.liabilities.current.unearnedCustomerDeposits, Notes: "Active package sessions not yet rendered" },
    { "Classification / Line Item": "TOTAL CURRENT LIABILITIES", "Amount (₱)": balanceSheet.liabilities.current.totalCurrentLiabilities, Notes: "Obligations due within 1 year" },
    { "Classification / Line Item": "Non-Current Liabilities:", "Amount (₱)": balanceSheet.liabilities.nonCurrent.totalNonCurrentLiabilities, Notes: "Long term debt obligations" },
    { "Classification / Line Item": "TOTAL LIABILITIES", "Amount (₱)": balanceSheet.liabilities.totalLiabilities, Notes: "Current + Non-Current Liabilities" },
    { "Classification / Line Item": "", "Amount (₱)": "", Notes: "" },

    // EQUITY
    { "Classification / Line Item": "OWNER'S EQUITY", "Amount (₱)": "", Notes: "" },
    { "Classification / Line Item": "  Owner's Capital (Initial & Contributed Capital)", "Amount (₱)": balanceSheet.equity.ownersCapital, Notes: "Clinic founder equity" },
    { "Classification / Line Item": "  Retained Earnings (Prior Years)", "Amount (₱)": balanceSheet.equity.retainedEarningsPrior, Notes: "Accumulated past retained profits" },
    { "Classification / Line Item": "  Current Period Net Income / (Loss)", "Amount (₱)": balanceSheet.equity.currentPeriodNetIncome, Notes: "Tied directly to Income Statement" },
    { "Classification / Line Item": "TOTAL OWNER'S EQUITY", "Amount (₱)": balanceSheet.equity.totalEquity, Notes: "Net worth of the clinic" },
    { "Classification / Line Item": "", "Amount (₱)": "", Notes: "" },

    // TOTAL LIABILITIES & EQUITY
    { "Classification / Line Item": "TOTAL LIABILITIES & EQUITY", "Amount (₱)": balanceSheet.totalLiabilitiesAndEquity, Notes: "Must equal Total Assets" },
    { "Classification / Line Item": "Accounting Balance Validation", "Amount (₱)": balanceSheet.isBalanced ? "BALANCED" : "VARIANCE DETECTED", Notes: `Assets = Liabilities + Equity (Variance: ₱${balanceSheet.balanceVariance.toFixed(2)})` }
  ];

  const wsBS = XLSX.utils.json_to_sheet(bsRows);
  XLSX.utils.book_append_sheet(wb, wsBS, "Balance Sheet");

  // ----------------------------------------------------------------------------
  // SHEET 3: Financial Ratios & Health
  // ----------------------------------------------------------------------------
  const ratioRows = [
    { "Financial Metric": "Current Ratio", Value: balanceSheet.ratios.currentRatio, "Benchmark / Norm": ">= 1.5x", Interpretation: balanceSheet.ratios.currentRatio >= 1.5 ? "Healthy Liquidity" : "Monitor Liquidity" },
    { "Financial Metric": "Quick Ratio (Acid Test)", Value: balanceSheet.ratios.quickRatio, "Benchmark / Norm": ">= 1.0x", Interpretation: balanceSheet.ratios.quickRatio >= 1.0 ? "Strong Short-Term Coverage" : "Requires Adequate Cash Buffer" },
    { "Financial Metric": "Net Working Capital (₱)", Value: balanceSheet.ratios.workingCapital, "Benchmark / Norm": "> ₱0.00", Interpretation: balanceSheet.ratios.workingCapital > 0 ? "Positive Operational Buffer" : "Negative Working Capital" },
    { "Financial Metric": "Gross Profit Margin", Value: `${balanceSheet.ratios.grossMarginPercentage.toFixed(2)}%`, "Benchmark / Norm": "60% - 85%", Interpretation: "Clinic aesthetic treatments service margin" },
    { "Financial Metric": "Net Profit Margin", Value: `${balanceSheet.ratios.netMarginPercentage.toFixed(2)}%`, "Benchmark / Norm": "15% - 35%", Interpretation: "Overall bottom line profitability" },
    { "Financial Metric": "Debt-to-Equity Ratio", Value: balanceSheet.ratios.debtToEquityRatio, "Benchmark / Norm": "< 1.5x", Interpretation: "Prudent leverage & low financial risk" },
    { "Financial Metric": "Total Cash & Equivalents (₱)", Value: balanceSheet.assets.current.totalCashAndEquivalents, "Benchmark / Norm": "Cash reserves", Interpretation: "Total liquid cash in drawers & digital wallets" },
    { "Financial Metric": "Total Active Inventory Value (₱)", Value: balanceSheet.assets.current.inventoryAsset.totalInventoryValuation, "Benchmark / Norm": "At Cost", Interpretation: "Capital currently tied up in clinic supplies" },
    { "Financial Metric": "Outstanding Client Receivables (₱)", Value: balanceSheet.assets.current.accountsReceivable.totalAccountsReceivable, "Benchmark / Norm": "Receivables", Interpretation: "Future collections from client financing" },
    { "Financial Metric": "Outstanding Vendor Payables (₱)", Value: balanceSheet.liabilities.current.accountsPayable.totalAccountsPayable, "Benchmark / Norm": "Payables", Interpretation: "Supplier bills due for settlement" },
  ];

  const wsRatios = XLSX.utils.json_to_sheet(ratioRows);
  XLSX.utils.book_append_sheet(wb, wsRatios, "Financial Ratios");

  // ----------------------------------------------------------------------------
  // SHEET 4: Operating Expenses Schedule
  // ----------------------------------------------------------------------------
  const opexRows = income.operatingExpenses.byCategory.length > 0
    ? income.operatingExpenses.byCategory.map(cat => ({
        "Expense Category": cat.categoryName,
        "Total Incurred (₱)": cat.amount,
        "Transaction Count": cat.count,
        "Share of OPEX (%)": `${cat.percentageOfOpex.toFixed(2)}%`,
      }))
    : [{ Note: "No categorized expenses recorded in this period." }];

  const wsOpex = XLSX.utils.json_to_sheet(opexRows);
  XLSX.utils.book_append_sheet(wb, wsOpex, "Expense Schedule");

  // ----------------------------------------------------------------------------
  // SHEET 5: Materials Consumed (Cost of Sales)
  // ----------------------------------------------------------------------------
  const cogsRows = income.cogs.topMaterialsUsed.length > 0
    ? income.cogs.topMaterialsUsed.map(item => ({
        "Supply / Material Name": item.itemName,
        Category: item.category,
        "Quantity Used": item.quantity,
        Unit: item.unit,
        "Unit Cost (₱)": item.unitCost,
        "Total Consumed Cost (₱)": item.totalCost,
      }))
    : [{ Note: "No session consumables deducted in this period." }];

  const wsCogs = XLSX.utils.json_to_sheet(cogsRows);
  XLSX.utils.book_append_sheet(wb, wsCogs, "Materials Consumed (COGS)");

  // Write out as Excel binary array
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
