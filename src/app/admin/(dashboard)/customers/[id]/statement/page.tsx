// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Printable Client Account Statement & Official History
// ==============================================================================

import { getCompleteClientFile, logClientFileExport } from "@/app/admin/(dashboard)/customers/actions";
import { generateClientFilePrintableHTML } from "@/lib/customers/client-file-html";
import { notFound } from "next/navigation";

interface StatementPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientStatementPage({ params }: StatementPageProps) {
  const { id } = await params;
  const res = await getCompleteClientFile(id);

  if (!res.success || !res.data) {
    notFound();
  }

  // Log export audit
  await logClientFileExport(id, "STATEMENT");

  const htmlContent = generateClientFilePrintableHTML(res.data);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className="bg-white min-h-screen"
    />
  );
}
