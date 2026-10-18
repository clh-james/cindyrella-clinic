// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Employee Self-Service Attendance Clock Page
// ==============================================================================

import { requireStaff } from "@/lib/auth";
import { getEmployeeSelfAttendance } from "../actions";
import { AttendanceClockClient } from "./AttendanceClockClient";

export const metadata = {
  title: "Staff Attendance Clock — Cindyrella Clinic",
};

export default async function AttendanceClockPage() {
  await requireStaff();
  const selfData = await getEmployeeSelfAttendance();

  return <AttendanceClockClient initialData={selfData as any} />;
}
