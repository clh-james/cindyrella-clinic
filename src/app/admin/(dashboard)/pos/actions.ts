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
  clientClassification?: "walk-in" | "booked" | "boosting_from_main" | string;
  handledBy?: string;
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
          email: `walkin-${Date.now()}@cindyrellaclinic.com`,
          client_classification: input.clientClassification || "walk-in"
        }
      )
      .select("id")
      .single();

    if (customerError) {
      // If client_classification does not exist on customers, retry without it
      const { data: retryCustomer, error: retryError } = await supabase
        .from("customers")
        .insert({
          first_name: input.customerName.split(' ')[0] || 'Walk-in', 
          last_name: input.customerName.split(' ').slice(1).join(' ') || '',
          phone: input.customerPhone,
          email: `walkin-${Date.now()}@cindyrellaclinic.com`
        })
        .select("id")
        .single();

      if (retryError || !retryCustomer) {
        console.error("Failed to save customer:", retryError || customerError);
        return { error: "Failed to save customer details." };
      }
      customer = retryCustomer;
    } else {
      customer = newCustomer;
    }
  }

  // 2. Create Appointment as checked_in
  const referenceNumber = generateReference();
  const date = new Date();
  const safeClassification = input.clientClassification || "walk-in";
  const safeHandlerId = input.handledBy?.trim() || null;
  
  // Save all items, classification, and handler in notes
  const itemsJson = JSON.stringify(input.items);
  let notesWithClassification = `${itemsJson}\n[Classification:${safeClassification}]`;
  if (safeHandlerId) {
    notesWithClassification += `\n[HandledBy:${safeHandlerId}]`;
  }
  
  // Safe payment method mapping for PostgreSQL enum payment_method
  // PostgreSQL enum has ('cash', 'credit_card', 'bank_transfer', 'gcash')
  const safePaymentMethod =
    input.paymentMethod === "card"
      ? "credit_card"
      : input.paymentMethod;

  const appointmentPayload: Record<string, unknown> = {
    reference_number: referenceNumber,
    customer_id: customer.id,
    treatment_id: input.items[0].id, // Primary treatment is first item
    branch_id: input.branchId,
    appointment_date: date.toISOString().split('T')[0],
    appointment_time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    payment_method: safePaymentMethod,
    amount_due: Math.round(Number(input.amountDue)),
    discount_amount: Math.round(Number(input.discountAmount || 0)),
    discount_reason: input.discountReason || null,
    client_classification: safeClassification,
    handled_by: safeHandlerId,
    status: "completed",
    payment_status: "paid",
    notes: notesWithClassification
  };

  let appointmentResult = await supabase
    .from("appointments")
    .insert(appointmentPayload)
    .select("id")
    .single();

  // If column client_classification or handled_by doesn't exist yet, retry without them
  if (appointmentResult.error && appointmentResult.error.code === "42703") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { client_classification: _c, handled_by: _h, ...fallbackPayload } = appointmentPayload;
    appointmentResult = await supabase
      .from("appointments")
      .insert(fallbackPayload)
      .select("id")
      .single();
  }

  // If DB enum rejected 'maya' (code 22P02), fallback to 'bank_transfer' (electronic e-wallet transfer)
  if (
    appointmentResult.error &&
    appointmentResult.error.code === "22P02" &&
    (input.paymentMethod === "maya" || safePaymentMethod === "maya")
  ) {
    const fallbackMaya: Record<string, unknown> = {
      ...appointmentPayload,
      payment_method: "bank_transfer",
    };
    appointmentResult = await supabase
      .from("appointments")
      .insert(fallbackMaya)
      .select("id")
      .single();

    if (appointmentResult.error && appointmentResult.error.code === "42703") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { client_classification: _c, handled_by: _h, ...finalPayload } = fallbackMaya;
      appointmentResult = await supabase
        .from("appointments")
        .insert(finalPayload)
        .select("id")
        .single();
    }
  }

  const { data: appointment, error: appointmentError } = appointmentResult;

  if (appointmentError || !appointment) {
    console.error("Failed to create walk-in appointment:", appointmentError);
    return { error: appointmentError?.message || "Failed to create walk-in appointment." };
  }

  // 3. Deduct inventory for treatment and update movements/balances
  const user = await supabase.auth.getUser();
  try {
    const { deductAppointmentInventory } = await import("@/lib/inventory/deduction");
    await deductAppointmentInventory(appointment.id, user.data.user?.id);
  } catch (dErr) {
    console.error("POS inventory deduction error:", dErr);
  }

  // 4. Auto-credit commission to handler's payroll if assigned
  if (safeHandlerId) {
    try {
      const { autoCreditAppointmentCommission } = await import("@/app/admin/actions");
      await autoCreditAppointmentCommission(appointment.id);
    } catch (commErr) {
      console.error("POS auto-credit commission error:", commErr);
    }
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/reports/financials");
  
  return { success: true, referenceNumber };
}

export async function processPOSRetail(input: {
  items: { id: string; price: number; quantity: number }[];
  branchId: string;
  paymentMethod: string;
  amountDue: number;
  customerName?: string;
  customerPhone?: string;
  clientClassification?: "walk-in" | "booked" | "boosting_from_main" | string;
  discountAmount?: number;
  discountReason?: string;
}) {
  const hasAccess = await hasServerPermission("pos.create_sale");
  if (!hasAccess) {
    return { error: "Forbidden: You do not have permission to create sales." };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  // Find or create customer if phone provided
  let customerId: string | null = null;
  if (input.customerPhone) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", input.customerPhone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else if (input.customerName) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          first_name: input.customerName.split(" ")[0] || "Customer",
          last_name: input.customerName.split(" ").slice(1).join(" ") || "",
          phone: input.customerPhone,
          email: `retail-${Date.now()}@cindyrellaclinic.com`,
          client_classification: input.clientClassification || "walk-in",
        })
        .select("id")
        .single();
      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }
  }

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
  const safeClassification = input.clientClassification || "walk-in";
  const salePayload: Record<string, unknown> = {
    reference_number: referenceNumber,
    total_amount: Math.round(Number(input.amountDue)),
    payment_method: input.paymentMethod,
    created_by: user.data.user?.id,
    branch_id: input.branchId,
    customer_id: customerId,
    discount_amount: Math.round(Number(input.discountAmount || 0)),
    discount_reason: input.discountReason || null,
    client_classification: safeClassification,
  };

  let { data: sale, error: saleError } = await supabase
    .from("pos_sales")
    .insert(salePayload)
    .select("id")
    .single();

  if (saleError && saleError.code === "42703") {
    // If client_classification column not created in DB yet, fallback without column
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { client_classification: _, ...fallbackPayload } = salePayload;
    const res = await supabase.from("pos_sales").insert(fallbackPayload).select("id").single();
    sale = res.data;
    saleError = res.error;
  }

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
  revalidatePath("/admin/reports/financials");
  
  return { success: true, referenceNumber };
}

export async function getRecentTransactions() {
  const supabase = await createClient();
  
  // Fetch retail sales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let salesData: any[] = [];
  const { data: salesWithClass, error: salesWithClassError } = await supabase
    .from("pos_sales")
    .select("reference_number, total_amount, payment_method, created_at, client_classification, discount_reason")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!salesWithClassError && salesWithClass) {
    salesData = salesWithClass;
  } else {
    const { data: sales, error: salesError } = await supabase
      .from("pos_sales")
      .select("reference_number, total_amount, payment_method, created_at, discount_reason")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!salesError && sales) salesData = sales;
  }

  // Fetch walk-in appointments (completed + paid)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apptsData: any[] = [];
  const { data: apptsWithClass, error: apptWithClassError } = await supabase
    .from("appointments")
    .select("id, reference_number, amount_due, payment_method, created_at, notes, client_classification, handled_by, staff:handled_by(full_name)")
    .eq("status", "completed")
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(30);

  if (!apptWithClassError && apptsWithClass) {
    apptsData = apptsWithClass;
  } else {
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, reference_number, amount_due, payment_method, created_at, notes")
      .eq("status", "completed")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!apptError && appointments) apptsData = appointments;
  }

  // Combine and sort
  const combined = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...salesData.map((s: any) => ({
      id: s.id,
      reference_number: s.reference_number,
      amount: s.total_amount,
      method: s.payment_method,
      type: "Retail Sale",
      client_classification: s.client_classification || (s.discount_reason?.match(/\[Classification:([^\]]+)\]/i)?.[1]) || "walk-in",
      handled_by_id: null,
      handled_by_name: null,
      date: new Date(s.created_at)
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...apptsData.map((a: any) => {
      let classification = a.client_classification;
      if (!classification && a.notes) {
        const match = a.notes.match(/\[Classification:([^\]]+)\]/i);
        if (match) classification = match[1];
      }
      let handlerId = a.handled_by || "";
      if (!handlerId && a.notes) {
        const match = a.notes.match(/\[HandledBy:([a-f0-9-]+)\]/i);
        if (match) handlerId = match[1];
      }
      return {
        id: a.id,
        reference_number: a.reference_number,
        amount: a.amount_due,
        method: a.payment_method,
        type: "Walk-in Treatment",
        client_classification: classification || "walk-in",
        handled_by_id: handlerId,
        handled_by_name: a.staff?.full_name || null,
        date: new Date(a.created_at)
      };
    })
  ];

  combined.sort((a, b) => b.date.getTime() - a.date.getTime());

  return { transactions: combined.slice(0, 30) };
}
