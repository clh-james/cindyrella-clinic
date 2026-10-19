// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Server Actions for Financial Statements (Income Statement & Balance Sheet)
// ==============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { calculateIncomeStatement, calculateBalanceSheet } from "@/lib/finance/financial-statements-engine";
import type { IncomeStatementData, BalanceSheetData } from "@/lib/finance/types";

interface GetFinancialsParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  asOfDate?: string; // YYYY-MM-DD
  branchId?: string | null;
}

export async function getFinancialStatementsAction(params: GetFinancialsParams): Promise<{
  success: boolean;
  data?: {
    incomeStatement: IncomeStatementData;
    balanceSheet: BalanceSheetData;
  };
  error?: string;
}> {
  try {
    const user = await requireStaff();
    const supabase = await createClient();

    // Fetch user profile name
    const { data: staffData } = await supabase
      .from("staff")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const userFullName = staffData?.full_name || "Authorized Staff";

    const incomeStatement = await calculateIncomeStatement(supabase, {
      startDate: params.startDate,
      endDate: params.endDate,
      branchId: params.branchId,
      userFullName,
    });

    const balanceSheet = await calculateBalanceSheet(
      supabase,
      {
        startDate: params.startDate,
        endDate: params.endDate,
        asOfDate: params.asOfDate || params.endDate,
        branchId: params.branchId,
        userFullName,
      },
      incomeStatement
    );

    return {
      success: true,
      data: {
        incomeStatement,
        balanceSheet,
      },
    };
  } catch (err: unknown) {
    console.error("Error in getFinancialStatementsAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate financial statements",
    };
  }
}
