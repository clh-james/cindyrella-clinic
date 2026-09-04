"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "POS-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function processPOSWalkin(input: {
  treatmentId: string;
  branchId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  amountDue: number;
}) {
  const supabase = await createClient();

  // 1. Create or find customer (simplified for MVP)
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert(
      { 
        first_name: input.customerName.split(' ')[0], 
        last_name: input.customerName.split(' ').slice(1).join(' ') || '',
        phone: input.customerPhone 
      },
      { onConflict: "phone" }
    )
    .select("id")
    .single();

  if (customerError || !customer) {
    return { error: "Failed to save customer details." };
  }

  // 2. Create Appointment as checked_in
  const referenceNumber = generateReference();
  const date = new Date();
  
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      reference_number: referenceNumber,
      customer_id: customer.id,
      treatment_id: input.treatmentId,
      branch_id: input.branchId,
      appointment_date: date.toISOString().split('T')[0],
      appointment_time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      payment_method: input.paymentMethod,
      amount_due: input.amountDue,
      status: "checked_in"
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return { error: "Failed to create walk-in appointment." };
  }

  // 3. Deduct inventory for treatment
  const user = await supabase.auth.getUser();
  await supabase.rpc('deduct_inventory_for_treatment', {
    p_treatment_id: input.treatmentId,
    p_user_id: user.data.user?.id
  });

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/inventory");
  
  return { success: true, referenceNumber };
}

export async function processPOSRetail(input: {
  items: { id: string; price: number; quantity: number }[];
  paymentMethod: string;
  amountDue: number;
}) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  // 1. Create Sale Record
  const referenceNumber = generateReference();
  const { data: sale, error: saleError } = await supabase
    .from("pos_sales")
    .insert({
      reference_number: referenceNumber,
      total_amount: input.amountDue,
      payment_method: input.paymentMethod,
      created_by: user.data.user?.id
    })
    .select("id")
    .single();

  if (saleError || !sale) {
    return { error: "Failed to record sale." };
  }

  // 2. Create Sale Items
  const saleItems = input.items.map(item => ({
    sale_id: sale.id,
    item_id: item.id,
    quantity: item.quantity,
    price_per_unit: item.price
  }));

  const { error: itemsError } = await supabase
    .from("pos_sale_items")
    .insert(saleItems);

  if (itemsError) {
    return { error: "Failed to record sale items." };
  }

  // 3. Deduct inventory for sale
  await supabase.rpc('deduct_inventory_for_sale', {
    p_sale_id: sale.id,
    p_user_id: user.data.user?.id
  });

  revalidatePath("/admin/inventory");
  
  return { success: true, referenceNumber };
}
