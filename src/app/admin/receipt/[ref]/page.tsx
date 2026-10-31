import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ReceiptClient } from "./ReceiptClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Receipt - Cindyrella",
};

export default async function ReceiptPage({ params }: { params: Promise<{ ref: string }> }) {
  await requireStaff(); // Ensure only staff can view full receipts
  
  const supabase = await createClient();
  const { ref } = await params;

  // 1. Try finding in appointments
  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select(`
      *,
      customers (*),
      branches (*),
      treatments (*)
    `)
    .eq("reference_number", ref)
    .maybeSingle();

  if (apptError) {
    console.error("Receipt appt error:", apptError);
  }

  if (appt) {
    let handlerStaff = null;
    let handlerId = appt.handled_by;
    if (!handlerId && appt.notes) {
      const match = appt.notes.match(/\[HandledBy:([a-f0-9-]+)\]/i);
      if (match) handlerId = match[1];
    }
    if (handlerId) {
      const { data: staffRecord } = await supabase
        .from("staff")
        .select("id, full_name, role")
        .eq("id", handlerId)
        .maybeSingle();
      handlerStaff = staffRecord;
    }

    return <ReceiptClient type="appointment" data={{ ...appt, handlerStaff }} />;
  }

  // 2. Try finding in pos_sales
  const { data: sale, error: saleError } = await supabase
    .from("pos_sales")
    .select(`
      *,
      customers (*),
      items:pos_sale_items (
        quantity, price_per_unit, 
        item:inventory_items (*)
      )
    `)
    .eq("reference_number", ref)
    .maybeSingle();

  if (saleError) {
    console.error("Receipt sale error:", saleError);
  }

  if (sale) {
    // Fetch branch and staff info separately to avoid foreign key issues
    const { data: branch } = await supabase.from("branches").select("*").limit(1).single();
    let staffData = null;
    if (sale.created_by) {
      const { data: staffRecord } = await supabase.from("staff").select("*").eq("id", sale.created_by).maybeSingle();
      staffData = staffRecord;
    }
    
    return <ReceiptClient type="retail" data={{ ...sale, branches: branch, staff: staffData }} />;
  }

  return notFound();
}
