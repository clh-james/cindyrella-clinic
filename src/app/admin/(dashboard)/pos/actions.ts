"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { hasServerPermission } from "@/lib/rbac";

function generateReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "POS-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function processPOSWalkin(input: {
  items: { id: string; name: string; price: number; quantity: number }[];
  branchId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  amountDue: number;
}) {
  const hasAccess = await hasServerPermission("pos.create_sale");
  if (!hasAccess) {
    return { error: "Forbidden: You do not have permission to create sales." };
  }

  const supabase = await createClient();

  // 1. Create or find customer (simplified for MVP)
  let customer;
  
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", input.customerPhone)
    .maybeSingle();

  if (existingCustomer) {
    customer = existingCustomer;
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert(
        { 
          first_name: input.customerName.split(' ')[0] || 'Walk-in', 
          last_name: input.customerName.split(' ').slice(1).join(' ') || '',
          phone: input.customerPhone,
          email: `walkin-${Date.now()}@cindyrellaclinic.com`
        }
      )
      .select("id")
      .single();

    if (customerError) {
      console.error("Failed to save customer:", customerError);
      return { error: "Failed to save customer details." };
    }
    customer = newCustomer;
  }

  // 2. Create Appointment as checked_in
  const referenceNumber = generateReference();
  const date = new Date();
  
  // Save all items in notes as JSON string
  const itemsJson = JSON.stringify(input.items);
  
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      reference_number: referenceNumber,
      customer_id: customer.id,
      treatment_id: input.items[0].id, // Primary treatment is first item
      branch_id: input.branchId,
      appointment_date: date.toISOString().split('T')[0],
      appointment_time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      payment_method: input.paymentMethod,
      amount_due: input.amountDue,
      status: "completed",
      payment_status: "paid",
      notes: itemsJson // Store full cart here
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return { error: "Failed to create walk-in appointment." };
  }

  // 3. Deduct inventory for all treatments
  const user = await supabase.auth.getUser();
  for (const item of input.items) {
    for (let i = 0; i < item.quantity; i++) {
      await supabase.rpc('deduct_inventory_for_treatment', {
        p_treatment_id: item.id,
        p_user_id: user.data.user?.id
      });
    }
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/inventory");
  
  return { success: true, referenceNumber };
}

export async function processPOSRetail(input: {
  items: { id: string; price: number; quantity: number }[];
  paymentMethod: string;
  amountDue: number;
}) {
  const hasAccess = await hasServerPermission("pos.create_sale");
  if (!hasAccess) {
    return { error: "Forbidden: You do not have permission to create sales." };
  }

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

export async function getRecentTransactions() {
  const supabase = await createClient();
  
  // Fetch retail sales
  const { data: sales, error: salesError } = await supabase
    .from("pos_sales")
    .select("reference_number, total_amount, payment_method, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch walk-in appointments (completed + paid)
  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select("reference_number, amount_due, payment_method, created_at")
    .eq("status", "completed")
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(20);

  if (salesError || apptError) {
    return { error: "Failed to fetch transactions." };
  }

  // Combine and sort
  const combined = [
    ...(sales || []).map(s => ({
      reference_number: s.reference_number,
      amount: s.total_amount,
      method: s.payment_method,
      type: "Retail Sale",
      date: new Date(s.created_at)
    })),
    ...(appointments || []).map(a => ({
      reference_number: a.reference_number,
      amount: a.amount_due,
      method: a.payment_method,
      type: "Walk-in Treatment",
      date: new Date(a.created_at)
    }))
  ];

  combined.sort((a, b) => b.date.getTime() - a.date.getTime());

  return { transactions: combined.slice(0, 30) };
}
