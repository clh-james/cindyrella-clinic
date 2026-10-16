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
  discountAmount?: number;
  discountReason?: string;
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
      amount_due: Math.round(Number(input.amountDue)),
      discount_amount: Math.round(Number(input.discountAmount || 0)),
      discount_reason: input.discountReason || null,
      status: "completed",
      payment_status: "paid",
      notes: itemsJson // Store full cart here
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    console.error("Failed to create walk-in appointment:", appointmentError);
    return { error: appointmentError?.message || "Failed to create walk-in appointment." };
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
  branchId: string;
  paymentMethod: string;
  amountDue: number;
  discountAmount?: number;
  discountReason?: string;
}) {
  const hasAccess = await hasServerPermission("pos.create_sale");
  if (!hasAccess) {
    return { error: "Forbidden: You do not have permission to create sales." };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  // 0. Safety & Stock Validation
  const itemIds = input.items.map(i => i.id);
  const { data: stockItems } = await supabase
    .from("inventory_items")
    .select("id, name, unit, current_stock, is_quarantined")
    .in("id", itemIds);

  if (stockItems) {
    const stockMap = new Map(stockItems.map(si => [si.id, si]));
    for (const item of input.items) {
      const dbItem = stockMap.get(item.id);
      if (dbItem) {
        if (dbItem.is_quarantined) {
          return { error: `Item "${dbItem.name}" is currently under clinical quarantine and cannot be sold.` };
        }
        if (dbItem.current_stock < item.quantity) {
          return { error: `Insufficient stock for "${dbItem.name}". Available: ${dbItem.current_stock} ${dbItem.unit}, Requested: ${item.quantity} ${dbItem.unit}.` };
        }
      }
    }
  }

  // 1. Create Sale Record
  const referenceNumber = generateReference();
  const { data: sale, error: saleError } = await supabase
    .from("pos_sales")
    .insert({
      reference_number: referenceNumber,
      total_amount: Math.round(Number(input.amountDue)),
      payment_method: input.paymentMethod,
      created_by: user.data.user?.id,
      branch_id: input.branchId,
      discount_amount: Math.round(Number(input.discountAmount || 0)),
      discount_reason: input.discountReason || null
    })
    .select("id")
    .single();

  if (saleError || !sale) {
    console.error("Failed to record retail sale:", saleError);
    return { error: saleError?.message || "Failed to record sale." };
  }

  // 2. Create Sale Items
  const saleItems = input.items.map(item => ({
    sale_id: sale.id,
    item_id: item.id,
    quantity: item.quantity,
    price_per_unit: Math.round(Number(item.price))
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

  // 4. Log in inventory_movements for audit trail
  try {
    const dStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    for (const item of input.items) {
      const dbItem = stockItems?.find(si => si.id === item.id);
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      await supabase.from("inventory_movements").insert({
        reference_number: `OUT-${dStr}-${rand}`,
        item_id: item.id,
        movement_type: "stock_out",
        quantity: item.quantity,
        unit: dbItem?.unit || "units",
        destination_branch_id: input.branchId,
        previous_quantity: dbItem?.current_stock ?? item.quantity,
        new_quantity: Math.max(0, (dbItem?.current_stock ?? item.quantity) - item.quantity),
        reason: "POS Retail Sale",
        notes: `Sale Reference: ${referenceNumber}`,
        reference_id: referenceNumber,
        performed_by: user.data.user?.id
      });
    }
  } catch {
    // Ignore if inventory_movements table not yet present
  }

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
