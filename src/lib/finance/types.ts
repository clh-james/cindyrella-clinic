// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Financial Statements Type Definitions (Income Statement & Balance Sheet)
// ==============================================================================

export interface FinancialPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;     // e.g. "October 2026", "Q4 2026", "Year-to-Date"
}

export interface BranchScope {
  id: string | null;
  name: string;
}

export interface RevenueBreakdown {
  serviceRevenue: number;          // Completed treatments & clinic bookings
  retailProductRevenue: number;    // POS retail merchandise
  packageRevenue: number;          // Treatment packages & upfront promos
  installmentCollections: number;  // Down payments & amortizations paid
  grossRevenue: number;
  discountsAndPromos: number;
  refundsAndReversals: number;
  netRevenue: number;
  byPaymentMethod: {
    cash: number;
    gcash: number;
    maya: number;
    card: number;
    bankTransfer: number;
    installment: number;
    other: number;
  };
}

export interface CostOfSalesItem {
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface CostOfGoodsSold {
  treatmentMaterialsCost: number;       // Consumables deducted per session/recipe
  retailProductsWholesaleCost: number;  // Cost of retail goods sold
  directPractitionerCommissions: number;// Staff commissions
  totalCogs: number;
  topMaterialsUsed: CostOfSalesItem[];
}

export interface ExpenseCategorySummary {
  categoryId: string;
  categoryName: string;
  amount: number;
  count: number;
  percentageOfOpex: number;
}

export interface OperatingExpenses {
  byCategory: ExpenseCategorySummary[];
  payrollSalaries: number;           // From approved/paid payroll runs
  pettyCashDisbursements: number;    // From cashier drawer drops/petty cash
  totalOperatingExpenses: number;
}

export interface IncomeStatementData {
  period: FinancialPeriod;
  branch: BranchScope;
  generatedAt: string;
  generatedBy: string;

  // Key Accounting Sections
  revenue: RevenueBreakdown;
  cogs: CostOfGoodsSold;
  grossProfit: number;               // netRevenue - totalCogs
  grossProfitMargin: number;         // (grossProfit / netRevenue) * 100

  operatingExpenses: OperatingExpenses;
  operatingIncome: number;           // grossProfit - totalOperatingExpenses (EBITDA)

  taxesAndOther: number;
  netProfit: number;                 // operatingIncome - taxesAndOther
  netProfitMargin: number;           // (netProfit / netRevenue) * 100
}

export interface CurrentAssets {
  cashInDrawers: number;             // Active cashier shift drawer balances
  pettyCashOnHand: number;           // Current balance in petty cash funds
  cashInBankAndEWallets: number;     // GCash, Maya, Bank transfers collected
  totalCashAndEquivalents: number;

  accountsReceivable: {
    clientInstallmentsReceivable: number; // Remaining installment contract balances
    unpaidAppointmentsReceivable: number;// Invoiced/unpaid client bookings
    totalAccountsReceivable: number;
  };

  inventoryAsset: {
    medicalSuppliesValuation: number;    // Sum of clinic supplies (stock * cost)
    retailProductsValuation: number;     // Sum of retail products (stock * cost)
    totalInventoryValuation: number;
    totalSKUCount: number;
  };

  prepaidExpenses: number;
  totalCurrentAssets: number;
}

export interface NonCurrentAssets {
  clinicEquipmentAndMachinery: number;   // Lasers, hydrafacial machines, autoclave
  leaseholdImprovements: number;         // Clinic interior, lighting, fixtures
  accumulatedDepreciation: number;       // Contra-asset
  netNonCurrentAssets: number;
}

export interface CurrentLiabilities {
  accountsPayable: {
    unpaidVendorBills: number;           // Outstanding bills due to suppliers
    unpaidApprovedExpenses: number;      // Reimbursables / approved expenses
    totalAccountsPayable: number;
  };
  accruedPayrollPayable: number;         // Unpaid staff salary balances
  unearnedCustomerDeposits: number;      // Advanced deposits / active prepaid packages
  totalCurrentLiabilities: number;
}

export interface NonCurrentLiabilities {
  longTermClinicLoans: number;
  leaseObligations: number;
  totalNonCurrentLiabilities: number;
}

export interface OwnerEquity {
  ownersCapital: number;                 // Starting investment / owner capital
  retainedEarningsPrior: number;         // Prior period accumulated earnings
  currentPeriodNetIncome: number;        // From Income Statement
  totalEquity: number;
}

export interface FinancialRatios {
  currentRatio: number;                  // Current Assets / Current Liabilities
  quickRatio: number;                    // (Cash + AR) / Current Liabilities
  workingCapital: number;                // Current Assets - Current Liabilities
  debtToEquityRatio: number;             // Total Liabilities / Total Equity
  grossMarginPercentage: number;
  netMarginPercentage: number;
}

export interface BalanceSheetData {
  asOfDate: string;                      // YYYY-MM-DD
  branch: BranchScope;
  generatedAt: string;
  generatedBy: string;

  assets: {
    current: CurrentAssets;
    nonCurrent: NonCurrentAssets;
    totalAssets: number;
  };

  liabilities: {
    current: CurrentLiabilities;
    nonCurrent: NonCurrentLiabilities;
    totalLiabilities: number;
  };

  equity: OwnerEquity;

  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  balanceVariance: number;               // totalAssets - totalLiabilitiesAndEquity

  ratios: FinancialRatios;
}

export interface CombinedFinancialStatements {
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  branches: { id: string; name: string }[];
}
