// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Staff Daily Attendance & Timekeeping Dashboard Page
// ==============================================================================

import { requireStaff } from "@/lib/auth";
import { getStaffAttendanceDashboard } from "./actions";
import { DailyAttendanceClient } from "./DailyAttendanceClient";

export const metadata = {
  title: "Daily Attendance & Timekeeping — Cindyrella Clinic",
};

interface AttendancePageProps {
  searchParams: Promise<{
    date?: string;
    branchId?: string;
    employeeId?: string;
    status?: string;
  }>;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  await requireStaff();
  const params = await searchParams;

  const dashboardData = await getStaffAttendanceDashboard({
    date: params.date,
    branchId: params.branchId,
    employeeId: params.employeeId,
    statusFilter: params.status,
  });

  return <DailyAttendanceClient initialData={dashboardData as any} />;
}
