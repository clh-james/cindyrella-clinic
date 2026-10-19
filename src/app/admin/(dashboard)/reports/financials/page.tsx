// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Financial Statements Hub Page (Income Statement & Balance Sheet Reports)
// ==============================================================================

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calculateIncomeStatement, calculateBalanceSheet } from "@/lib/finance/financial-statements-engine";
import { FinancialStatementsClient } from "./FinancialStatementsClient";

export default async function FinancialStatementsPage() {
  const user = await requireStaff();
  const supabase = await createClient();

  // Get current month date range
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  const asOfDate = endDate;

  // Fetch branches
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .order("name", { ascending: true });

  // Fetch staff full name
  const { data: staffData } = await supabase
    .from("staff")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const userFullName = staffData?.full_name || "Authorized Staff";

  // Calculate initial consolidated statements
  const incomeStatement = await calculateIncomeStatement(supabase, {
    startDate,
    endDate,
    branchId: null,
    userFullName,
  });

  const balanceSheet = await calculateBalanceSheet(
    supabase,
    {
      startDate,
      endDate,
      asOfDate,
      branchId: null,
      userFullName,
    },
    incomeStatement
  );

  return (
    <FinancialStatementsClient
      initialIncomeStatement={incomeStatement}
      initialBalanceSheet={balanceSheet}
      branches={branches || []}
    />
  );
}
