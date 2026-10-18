"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ExpenseFormData } from "./types";

function generateExpenseNumber(): string {
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EXP-${yearMonth}-${rand}`;
}

// 1. RECORD NEW EXPENSE
export async function recordExpense(formData: ExpenseFormData) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const expenseNumber = generateExpenseNumber();

    const insertPayload = {
      expense_number: expenseNumber,
      branch_id: formData.branch_id || staff.branchId || null,
      category_id: formData.category_id,
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      amount: Math.round(Number(formData.amount) * 100) / 100,
      expense_date: formData.expense_date,
      payment_method: formData.payment_method,
      reference_number: formData.reference_number?.trim() || null,
      vendor_or_payee: formData.vendor_or_payee.trim(),
      receipt_url: formData.receipt_url?.trim() || null,
      is_petty_cash: formData.is_petty_cash || formData.payment_method === "petty_cash",
      status: "pending",
      created_by: staff.id,
    };

    const { data: exp, error: insertError } = await supabase
      .from("expenses")
      .insert(insertPayload)
      .select("id, expense_number, amount, branch_id")
      .single();

    if (insertError) throw insertError;

    // Deduct from petty cash fund if applicable
    if (insertPayload.is_petty_cash && insertPayload.branch_id) {
      const { data: fund } = await supabase
        .from("petty_cash_funds")
        .select("id, current_balance")
        .eq("branch_id", insertPayload.branch_id)
        .maybeSingle();

      if (fund) {
        await supabase
          .from("petty_cash_funds")
          .update({
            current_balance: Math.max(0, Number(fund.current_balance) - Number(insertPayload.amount)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", fund.id);
      }
    }

    // Record audit log
    await supabase.from("expense_audit_logs").insert({
      expense_id: exp.id,
      actor_id: staff.id,
      action: "CREATED",
      notes: `Recorded by ${staff.fullName} for ₱${insertPayload.amount.toFixed(2)} to ${insertPayload.vendor_or_payee}`,
    });

    revalidatePath("/admin/expenses");
    return { success: true, expenseId: exp.id, expenseNumber: exp.expense_number };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record expense";
    return { success: false, error: message };
  }
}

// 2. UPDATE EXPENSE
export async function updateExpense(
  id: string,
  formData: Partial<ExpenseFormData>
) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.title !== undefined) updatePayload.title = formData.title.trim();
    if (formData.category_id !== undefined) updatePayload.category_id = formData.category_id;
    if (formData.branch_id !== undefined) updatePayload.branch_id = formData.branch_id;
    if (formData.amount !== undefined) updatePayload.amount = Math.round(Number(formData.amount) * 100) / 100;
    if (formData.expense_date !== undefined) updatePayload.expense_date = formData.expense_date;
    if (formData.payment_method !== undefined) updatePayload.payment_method = formData.payment_method;
    if (formData.reference_number !== undefined) updatePayload.reference_number = formData.reference_number.trim() || null;
    if (formData.vendor_or_payee !== undefined) updatePayload.vendor_or_payee = formData.vendor_or_payee.trim();
    if (formData.receipt_url !== undefined) updatePayload.receipt_url = formData.receipt_url.trim() || null;
    if (formData.description !== undefined) updatePayload.description = formData.description.trim() || null;
    if (formData.is_petty_cash !== undefined) updatePayload.is_petty_cash = formData.is_petty_cash;

    const { error } = await supabase
      .from("expenses")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw error;

    await supabase.from("expense_audit_logs").insert({
      expense_id: id,
      actor_id: staff.id,
      action: "UPDATED",
      notes: `Updated by ${staff.fullName}`,
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update expense";
    return { success: false, error: message };
  }
}

// 3. APPROVE EXPENSE
export async function approveExpense(id: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("expenses")
      .update({
        status: "approved",
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    await supabase.from("expense_audit_logs").insert({
      expense_id: id,
      actor_id: staff.id,
      action: "APPROVED",
      notes: `Approved for reimbursement and accounting ledger by ${staff.fullName}`,
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve expense";
    return { success: false, error: message };
  }
}

// 4. REJECT EXPENSE
export async function rejectExpense(id: string, reason: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // Get original expense to check if petty cash needs restoring
    const { data: exp } = await supabase
      .from("expenses")
      .select("amount, branch_id, is_petty_cash, status")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("expenses")
      .update({
        status: "rejected",
        rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    // Refund petty cash fund if it was rejected
    if (exp?.is_petty_cash && exp?.branch_id) {
      const { data: fund } = await supabase
        .from("petty_cash_funds")
        .select("id, current_balance")
        .eq("branch_id", exp.branch_id)
        .maybeSingle();

      if (fund) {
        await supabase
          .from("petty_cash_funds")
          .update({
            current_balance: Number(fund.current_balance) + Number(exp.amount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", fund.id);
      }
    }

    await supabase.from("expense_audit_logs").insert({
      expense_id: id,
      actor_id: staff.id,
      action: "REJECTED",
      notes: `Rejected by ${staff.fullName}. Reason: ${reason}`,
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reject expense";
    return { success: false, error: message };
  }
}

// 5. DELETE EXPENSE
export async function deleteExpense(id: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: exp } = await supabase
      .from("expenses")
      .select("status, is_petty_cash, amount, branch_id")
      .eq("id", id)
      .single();

    if (exp?.status === "approved" && staff.role !== "super_admin") {
      throw new Error("Cannot delete approved expense without Super Admin authorization.");
    }

    // Refund petty cash if unapproved deletion
    if (exp?.is_petty_cash && exp?.branch_id && exp.status !== "rejected") {
      const { data: fund } = await supabase
        .from("petty_cash_funds")
        .select("id, current_balance")
        .eq("branch_id", exp.branch_id)
        .maybeSingle();

      if (fund) {
        await supabase
          .from("petty_cash_funds")
          .update({
            current_balance: Number(fund.current_balance) + Number(exp.amount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", fund.id);
      }
    }

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete expense";
    return { success: false, error: message };
  }
}

// 6. CREATE CATEGORY
export async function createExpenseCategory(
  name: string,
  description: string,
  color: string
) {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("expense_categories")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#4F46E5",
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/admin/expenses");
    return { success: true, category: data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create category";
    return { success: false, error: message };
  }
}

// 7. REPLENISH PETTY CASH
export async function replenishPettyCash(
  branchId: string,
  amount: number,
  notes?: string
) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: fund } = await supabase
      .from("petty_cash_funds")
      .select("id, current_balance, target_float")
      .eq("branch_id", branchId)
      .maybeSingle();

    if (!fund) {
      await supabase.from("petty_cash_funds").insert({
        branch_id: branchId,
        current_balance: amount,
        target_float: amount,
        last_replenished_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("petty_cash_funds")
        .update({
          current_balance: Number(fund.current_balance) + Number(amount),
          last_replenished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", fund.id);
    }

    await supabase.from("expense_audit_logs").insert({
      actor_id: staff.id,
      action: "PETTY_CASH_TOPUP",
      notes: `Petty cash replenished by ₱${amount.toFixed(2)}${notes ? `: ${notes}` : ""}`,
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to replenish petty cash";
    return { success: false, error: message };
  }
}

// 8. UPLOAD RECEIPT IMAGE
export async function uploadReceiptFile(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("expense-receipts")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    const { data: publicData } = supabase.storage
      .from("expense-receipts")
      .getPublicUrl(fileName);

    return { success: true, url: publicData.publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload receipt";
    return { success: false, error: message };
  }
}
