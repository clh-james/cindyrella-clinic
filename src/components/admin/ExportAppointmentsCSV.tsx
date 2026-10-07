"use client";

import { Download } from "lucide-react";

export function ExportAppointmentsCSV({ appointments }: { appointments: any[] }) {
  const handleExport = () => {
    // 1. Define CSV headers
    const headers = [
      "Reference",
      "Client First Name",
      "Client Last Name",
      "Client Phone",
      "Treatment",
      "Branch",
      "Date",
      "Time",
      "Amount Due",
      "Status",
      "Payment Method"
    ];

    // 2. Map data to rows
    const rows = appointments.map((a) => {
      const treatmentName = (a.treatments as any)?.name || "";
      const branchName = (a.branches as any)?.name || "";
      const customer = a.customers as any;
      const firstName = customer?.first_name || "";
      const lastName = customer?.last_name || "";
      const phone = customer?.phone || "";

      return [
        a.reference_number || "",
        firstName,
        lastName,
        phone,
        treatmentName,
        branchName,
        a.appointment_date || "",
        a.appointment_time || "",
        a.amount_due?.toString() || "0",
        a.status || "",
        a.payment_method || ""
      ].map(val => `"${val.replace(/"/g, '""')}"`).join(","); // Escape quotes and wrap in quotes
    });

    // 3. Combine headers and rows
    const csvContent = [headers.join(","), ...rows].join("\n");

    // 4. Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `appointments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={handleExport}
      className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-royal hover:text-royal"
    >
      <Download size={16} />
      Export CSV
    </button>
  );
}
