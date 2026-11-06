import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlySalesReport } from "@/lib/reports/monthly-sales-engine";
import { MonthlySalesReportClient } from "./MonthlySalesReportClient";

export const metadata = {
  title: "Monthly Detailed Sales Report — Cindyrella Admin",
  description: "Comprehensive monthly sales log with grouped category amounts, client details, and Excel export.",
};

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    branch?: string;
    search?: string;
  }>;
}

export default async function MonthlySalesReportPage({ searchParams }: PageProps) {
  const staff = await requireStaff();
  const supabase = await createClient();

  const resolvedParams = await searchParams;

  const now = new Date();
  // If user navigated without params, default to October 2026 if current transactions are concentrated there, or current month
  const defaultYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();
  // If no month is explicitly set in URL and current month is November but user has October records, let's default to month in param or 10 if month is not provided
  const defaultMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() === 10 ? 10 : now.getMonth() + 1);

  const selectedBranchId = resolvedParams.branch || (staff.branchId ? staff.branchId : "all");

  // Fetch branches authorized for this staff
  let branchesQuery = supabase.from("branches").select("id, name").eq("is_active", true).order("name");
  if (staff.branchId) {
    branchesQuery = branchesQuery.eq("id", staff.branchId);
  }
  const { data: branches } = await branchesQuery;

  // Generate monthly report
  const reportData = await generateMonthlySalesReport(supabase, {
    year: defaultYear,
    month: defaultMonth,
    branchId: selectedBranchId === "all" ? null : selectedBranchId,
    searchQuery: resolvedParams.search,
  });

  return (
    <MonthlySalesReportClient
      initialData={reportData}
      branches={branches || []}
      currentBranchId={staff.branchId}
      selectedYear={defaultYear}
      selectedMonth={defaultMonth}
      selectedBranchId={selectedBranchId}
    />
  );
}

