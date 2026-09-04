import { requireStaff } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();

  return (
    <AdminShell fullName={staff.fullName} role={staff.role}>
      {children}
    </AdminShell>
  );
}
