import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ReceiptClient } from "./ReceiptClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Receipt - Cindyrella",
};

export default async function ReceiptPage({ params }: { params: { ref: string } }) {
  await requireStaff(); // Ensure only staff can view full receipts
  
  const supabase = await createClient();
  const ref = params.ref;

  // 1. Try finding in appointments
  const { data: appt } = await supabase
    .from("appointments")
    .select(`
      *,
      customers (id, first_name, last_name, phone, email),
      branches (id, name, address, contact_number, email),
      treatments (id, name, session_price, category),
      staff:staff_id (id, full_name)
    `)
    .eq("reference_number", ref)
    .maybeSingle();

  if (appt) {
    return <ReceiptClient type="appointment" data={appt} />;
  }

  // 2. Try finding in pos_sales
  const { data: sale } = await supabase
    .from("pos_sales")
    .select(`
      *,
      customers (id, first_name, last_name, phone, email),
      staff:created_by (id, full_name),
      items:pos_sale_items (
        quantity, price_per_unit, 
        item:inventory_items (id, name, category)
      )
    `)
    .eq("reference_number", ref)
    .maybeSingle();

  if (sale) {
    // Need to fetch branch from somewhere? pos_sales doesn't have branch_id?
    // Let's get the first branch as a fallback, or if we can get it from staff.
    const { data: branch } = await supabase.from("branches").select("*").limit(1).single();
    
    return <ReceiptClient type="retail" data={{ ...sale, branches: branch }} />;
  }

  return notFound();
}
