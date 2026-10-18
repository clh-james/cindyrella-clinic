"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ExpenseFormData, ExpensePaymentMethod } from "./types";

function generateExpenseNumber(): string {
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EXP-${yearMonth}-${rand}`;
}

function generatePaymentNumber(): string {
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAY-${yearMonth}-${rand}`;
}

// 1. RECORD NEW EXPENSE
export async function recordExpense(formData: ExpenseFormData) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // Branch enforcement for non-super-admins
    let targetBranchId = formData.branch_id;
    if (staff.role !== "super_admin" && staff.role !== "admin") {
      targetBranchId = staff.branchId || formData.branch_id;
    }

    if (!targetBranchId) {
      return { success: false, error: "Please specify an authorized clinic branch." };
    }

    // Amounts validation
    const amountBeforeTax = Math.max(0, Math.round(Number(formData.amount_before_tax || 0) * 100) / 100);
    const taxAmount = Math.max(0, Math.round(Number(formData.tax_amount || 0) * 100) / 100);
    const totalAmount = Math.round(Number(formData.total_amount || (amountBeforeTax + taxAmount)) * 100) / 100;

    if (totalAmount <= 0) {
      return { success: false, error: "Total expense amount must be greater than ₱0.00." };
    }

    // Category inspection
    const { data: category } = await supabase
      .from("expense_categories")
      .select("id, name, requires_receipt, requires_approval")
      .eq("id", formData.category_id)
      .maybeSingle();

    if (category?.requires_receipt && !formData.receipt_url && (!formData.attachments || formData.attachments.length === 0)) {
      return { success: false, error: `Category "${category.name}" requires an invoice or official receipt attachment.` };
    }

    // Approval status initialization
    const approvalStatus = category?.requires_approval === false ? "approved" : "pending";
    const expenseNumber = generateExpenseNumber();

    const isPettyCash = formData.is_petty_cash || formData.payment_method === "petty_cash";
    const isDrawer = formData.payment_method === "cashier_drawer";
    const recordImmediate = formData.record_immediate_payment || isPettyCash || isDrawer;

    // Check cashier shift if drawer disbursement
    let activeShiftId: string | null = null;
    if (isDrawer) {
      const { data: shift } = await supabase
        .from("cashier_shifts")
        .select("id, status")
        .eq("branch_id", targetBranchId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!shift) {
        return {
          success: false,
          error: "No active cashier shift is currently open for this branch to disburse physical cash from drawer.",
        };
      }
      activeShiftId = shift.id;
    }

    const insertPayload = {
      expense_number: expenseNumber,
      branch_id: targetBranchId,
      category_id: formData.category_id,
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      vendor_or_payee: formData.vendor_or_payee.trim(),
      amount_before_tax: amountBeforeTax,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      approved_amount: approvalStatus === "approved" ? totalAmount : null,
      expense_date: formData.expense_date,
      payment_method: formData.payment_method,
      payment_account: formData.payment_account?.trim() || null,
      payment_status: recordImmediate ? "paid" : "unpaid",
      payment_date: recordImmediate ? formData.expense_date : null,
      approval_status: approvalStatus,
      is_petty_cash: isPettyCash,
      is_reimbursement: !!formData.is_reimbursement,
      employee_id: formData.is_reimbursement ? (formData.employee_id || staff.id) : null,
      requested_by: staff.id,
      reference_number: formData.reference_number?.trim() || null,
      receipt_url: formData.receipt_url?.trim() || null,
      notes: formData.notes?.trim() || null,
    };

    const { data: exp, error: insertError } = await supabase
      .from("expenses")
      .insert(insertPayload)
      .select("id, expense_number, total_amount, branch_id")
      .single();

    if (insertError) throw insertError;

    // Insert attachments if provided
    if (formData.attachments && formData.attachments.length > 0) {
      const attachmentRows = formData.attachments.map((att) => ({
        expense_id: exp.id,
        file_name: att.file_name,
        file_url: att.file_url,
        file_size: att.file_size || null,
        mime_type: att.mime_type || null,
        uploaded_by: staff.id,
      }));
      await supabase.from("expense_attachments").insert(attachmentRows);
    }

    // Handle immediate payment (petty cash or drawer)
    if (recordImmediate) {
      const paymentNumber = generatePaymentNumber();
      await supabase.from("expense_payments").insert({
        expense_id: exp.id,
        payment_number: paymentNumber,
        amount: totalAmount,
        payment_date: formData.expense_date,
        payment_method: formData.payment_method,
        payment_account: formData.payment_account || (isPettyCash ? "Petty Cash Drawer" : "Cashier Drawer"),
        reference_number: formData.reference_number || null,
        paid_by: staff.id,
        shift_id: activeShiftId,
        notes: `Immediate payment recorded upon expense creation`,
      });

      // Deduct from petty cash fund
      if (isPettyCash && targetBranchId) {
        const { data: fund } = await supabase
          .from("petty_cash_funds")
          .select("id, current_balance")
          .eq("branch_id", targetBranchId)
          .maybeSingle();

        if (fund) {
          await supabase
            .from("petty_cash_funds")
            .update({
              current_balance: Math.max(0, Number(fund.current_balance) - totalAmount),
              updated_at: new Date().toISOString(),
            })
            .eq("id", fund.id);
        }
      }

      // Record disbursement in active cashier shift
      if (isDrawer && activeShiftId) {
        const { data: shiftData } = await supabase
          .from("cashier_shifts")
          .select("id, cash_disbursements")
          .eq("id", activeShiftId)
          .single();

        if (shiftData) {
          await supabase
            .from("cashier_shifts")
            .update({
              cash_disbursements: (shiftData.cash_disbursements || 0) + Math.round(totalAmount),
              updated_at: new Date().toISOString(),
            })
            .eq("id", activeShiftId);
        }
      }
    }

    // System audit logs
    await supabase.from("expense_audit_logs").insert({
      expense_id: exp.id,
      actor_id: staff.id,
      action: formData.is_reimbursement ? "EXPENSE_REIMBURSEMENT_SUBMITTED" : "EXPENSE_CREATED",
      notes: `Recorded by ${staff.fullName} for ₱${totalAmount.toFixed(2)} to ${formData.vendor_or_payee}`,
      details: {
        expense_number: exp.expense_number,
        total_amount: totalAmount,
        payment_method: formData.payment_method,
        is_reimbursement: formData.is_reimbursement,
      },
    });

    await supabase.from("audit_logs").insert({
      action: formData.is_reimbursement ? "EXPENSE_REIMBURSEMENT_SUBMITTED" : "EXPENSE_CREATED",
      resource_type: "expenses",
      resource_id: exp.id,
      user_id: staff.id,
      branch_id: targetBranchId,
      metadata: {
        expense_number: exp.expense_number,
        amount: totalAmount,
        payee: formData.vendor_or_payee,
      },
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/shifts");
    return { success: true, expenseId: exp.id, expenseNumber: exp.expense_number };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record expense";
    return { success: false, error: message };
  }
}

// 2. UPDATE EXPENSE (Draft or Rejected only)
export async function updateExpense(id: string, formData: Partial<ExpenseFormData>) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("expenses")
      .select("id, approval_status, payment_status, requested_by, branch_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) return { success: false, error: "Expense not found." };

    if (existing.approval_status === "approved" || existing.payment_status === "paid") {
      return { success: false, error: "Approved or paid expenses cannot be modified directly." };
    }

    // Branch enforcement
    if (staff.role !== "super_admin" && staff.role !== "admin" && existing.branch_id !== staff.branchId) {
      return { success: false, error: "Access denied. You cannot modify expenses from another branch." };
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.title !== undefined) updatePayload.title = formData.title.trim();
    if (formData.category_id !== undefined) updatePayload.category_id = formData.category_id;
    if (formData.description !== undefined) updatePayload.description = formData.description?.trim() || null;
    if (formData.vendor_or_payee !== undefined) updatePayload.vendor_or_payee = formData.vendor_or_payee.trim();
    if (formData.expense_date !== undefined) updatePayload.expense_date = formData.expense_date;
    if (formData.payment_method !== undefined) updatePayload.payment_method = formData.payment_method;
    if (formData.reference_number !== undefined) updatePayload.reference_number = formData.reference_number?.trim() || null;
    if (formData.receipt_url !== undefined) updatePayload.receipt_url = formData.receipt_url?.trim() || null;
    if (formData.notes !== undefined) updatePayload.notes = formData.notes?.trim() || null;

    if (formData.amount_before_tax !== undefined || formData.tax_amount !== undefined || formData.total_amount !== undefined) {
      const beforeTax = Math.max(0, Number(formData.amount_before_tax || 0));
      const tax = Math.max(0, Number(formData.tax_amount || 0));
      const total = Math.round(Number(formData.total_amount || (beforeTax + tax)) * 100) / 100;
      updatePayload.amount_before_tax = beforeTax;
      updatePayload.tax_amount = tax;
      updatePayload.total_amount = total;
    }

    const { error: updateErr } = await supabase
      .from("expenses")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) throw updateErr;

    await supabase.from("expense_audit_logs").insert({
      expense_id: id,
      actor_id: staff.id,
      action: "EXPENSE_UPDATED",
      notes: `Updated by ${staff.fullName}`,
      details: updatePayload,
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update expense";
    return { success: false, error: message };
  }
}

// 3. SUBMIT FOR APPROVAL
export async function submitForApproval(expenseId: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: exp } = await supabase
      .from("expenses")
      .select("id, approval_status, expense_number, branch_id")
      .eq("id", expenseId)
      .single();

    if (!exp) return { success: false, error: "Expense not found." };
    if (exp.approval_status !== "draft" && exp.approval_status !== "rejected") {
      return { success: false, error: `Expense is currently "${exp.approval_status}", cannot submit.` };
    }

    await supabase
      .from("expenses")
      .update({
        approval_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId);

    await supabase.from("expense_audit_logs").insert({
      expense_id: expenseId,
      actor_id: staff.id,
      action: "EXPENSE_SUBMITTED",
      notes: `Submitted for manager/admin approval by ${staff.fullName}`,
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit expense";
    return { success: false, error: message };
  }
}

// 4. APPROVE EXPENSE (With separation of duties!)
export async function approveExpense(
  expenseId: string,
  approvedAmount?: number,
  notes?: string
) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // Role check: Only super_admin, admin, manager can approve
    if (!["super_admin", "admin", "manager"].includes(staff.role)) {
      return { success: false, error: "Unauthorized. Manager or Admin access required to approve expenses." };
    }

    const { data: exp, error: fetchErr } = await supabase
      .from("expenses")
      .select("id, expense_number, total_amount, requested_by, employee_id, approval_status, payment_status, branch_id")
      .eq("id", expenseId)
      .single();

    if (fetchErr || !exp) return { success: false, error: "Expense not found." };

    // Separation of duties: Requester cannot approve their own expense!
    if (staff.role !== "super_admin" && (exp.requested_by === staff.id || exp.employee_id === staff.id)) {
      return {
        success: false,
        error: "Separation of duties violation: You cannot approve an expense that you requested yourself.",
      };
    }

    // Branch isolation for managers
    if (staff.role === "manager" && exp.branch_id && exp.branch_id !== staff.branchId) {
      return { success: false, error: "Access denied. You can only approve expenses for your assigned branch." };
    }

    const finalApprovedAmount = approvedAmount ? Math.min(exp.total_amount, approvedAmount) : exp.total_amount;
    const now = new Date().toISOString();

    const newApprovalStatus = exp.payment_status === "paid" ? "approved" : "payment_pending";

    const { error: updateErr } = await supabase
      .from("expenses")
      .update({
        approval_status: newApprovalStatus,
        approved_amount: finalApprovedAmount,
        approved_by: staff.id,
        approved_at: now,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", expenseId);

    if (updateErr) throw updateErr;

    await supabase.from("expense_audit_logs").insert({
      expense_id: expenseId,
      actor_id: staff.id,
      action: "EXPENSE_APPROVED",
      notes: notes || `Approved by ${staff.fullName} for ₱${finalApprovedAmount.toFixed(2)}`,
      details: { approved_amount: finalApprovedAmount },
    });

    await supabase.from("audit_logs").insert({
      action: "EXPENSE_APPROVED",
      resource_type: "expenses",
      resource_id: expenseId,
      user_id: staff.id,
      branch_id: exp.branch_id,
      metadata: { expense_number: exp.expense_number, approved_amount: finalApprovedAmount },
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve expense";
    return { success: false, error: message };
  }
}

// 5. REJECT EXPENSE (With separation of duties & petty cash refund)
export async function rejectExpense(expenseId: string, reason: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: "A rejection reason is strictly required." };
    }

    if (!["super_admin", "admin", "manager"].includes(staff.role)) {
      return { success: false, error: "Unauthorized. Manager or Admin access required to reject expenses." };
    }

    const { data: exp, error: fetchErr } = await supabase
      .from("expenses")
      .select("id, expense_number, total_amount, requested_by, employee_id, is_petty_cash, branch_id, payment_status")
      .eq("id", expenseId)
      .single();

    if (fetchErr || !exp) return { success: false, error: "Expense not found." };

    // Separation of duties
    if (staff.role !== "super_admin" && (exp.requested_by === staff.id || exp.employee_id === staff.id)) {
      return { success: false, error: "Separation of duties violation: You cannot review your own expense." };
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("expenses")
      .update({
        approval_status: "rejected",
        payment_status: "cancelled",
        rejected_by: staff.id,
        rejected_at: now,
        rejection_reason: reason.trim(),
        updated_at: now,
      })
      .eq("id", expenseId);

    if (updateErr) throw updateErr;

    // Refund petty cash fund if it was deducted
    if (exp.is_petty_cash && exp.branch_id && exp.payment_status === "paid") {
      const { data: fund } = await supabase
        .from("petty_cash_funds")
        .select("id, current_balance")
        .eq("branch_id", exp.branch_id)
        .maybeSingle();

      if (fund) {
        await supabase
          .from("petty_cash_funds")
          .update({
            current_balance: Number(fund.current_balance) + Number(exp.total_amount),
            updated_at: now,
          })
          .eq("id", fund.id);
      }
    }

    await supabase.from("expense_audit_logs").insert({
      expense_id: expenseId,
      actor_id: staff.id,
      action: "EXPENSE_REJECTED",
      notes: `Rejected by ${staff.fullName}. Reason: ${reason.trim()}`,
      details: { reason: reason.trim() },
    });

    await supabase.from("audit_logs").insert({
      action: "EXPENSE_REJECTED",
      resource_type: "expenses",
      resource_id: expenseId,
      user_id: staff.id,
      branch_id: exp.branch_id,
      metadata: { expense_number: exp.expense_number, reason: reason.trim() },
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reject expense";
    return { success: false, error: message };
  }
}

// 6. RECORD EXPENSE PAYMENT (With Cashier Drawer & Partial Payment support)
export async function recordPayment(data: {
  expenseId: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  paymentAccount?: string;
  referenceNumber?: string;
  notes?: string;
  shiftId?: string;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const paymentAmount = Math.round(Number(data.amount) * 100) / 100;
    if (paymentAmount <= 0) {
      return { success: false, error: "Payment amount must be greater than ₱0.00." };
    }

    const { data: exp, error: fetchErr } = await supabase
      .from("expenses")
      .select("id, expense_number, total_amount, approved_amount, branch_id, approval_status, payment_status")
      .eq("id", data.expenseId)
      .single();

    if (fetchErr || !exp) return { success: false, error: "Expense record not found." };

    if (exp.approval_status === "rejected" || exp.approval_status === "archived") {
      return { success: false, error: `Cannot record payment for a ${exp.approval_status} expense.` };
    }

    // Calculate existing payments
    const { data: existingPayments } = await supabase
      .from("expense_payments")
      .select("amount, is_reversed")
      .eq("expense_id", data.expenseId)
      .eq("is_reversed", false);

    const totalValidPaid = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const targetPayable = exp.approved_amount || exp.total_amount;
    const outstandingBalance = Math.round((targetPayable - totalValidPaid) * 100) / 100;

    // Prevent overpayment
    if (paymentAmount > outstandingBalance + 0.01) {
      return {
        success: false,
        error: `Overpayment prohibited. Maximum remaining balance is ₱${outstandingBalance.toFixed(2)}.`,
      };
    }

    // Cashier Drawer integration
    let shiftId = data.shiftId || null;
    if (data.paymentMethod === "cashier_drawer") {
      if (!shiftId) {
        const { data: openShift } = await supabase
          .from("cashier_shifts")
          .select("id")
          .eq("branch_id", exp.branch_id)
          .eq("status", "open")
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!openShift) {
          return {
            success: false,
            error: "No active cashier shift is open for this branch to disburse drawer cash.",
          };
        }
        shiftId = openShift.id;
      }
    }

    // Petty cash balance validation
    if (data.paymentMethod === "petty_cash" && exp.branch_id) {
      const { data: fund } = await supabase
        .from("petty_cash_funds")
        .select("id, current_balance")
        .eq("branch_id", exp.branch_id)
        .maybeSingle();

      if (fund && Number(fund.current_balance) < paymentAmount) {
        return {
          success: false,
          error: `Insufficient petty cash float (Current balance: ₱${Number(fund.current_balance).toFixed(2)}). Please replenish first.`,
        };
      }
    }

    const paymentNumber = generatePaymentNumber();
    const today = new Date().toISOString().split("T")[0];

    const { data: newPayment, error: payErr } = await supabase
      .from("expense_payments")
      .insert({
        expense_id: data.expenseId,
        payment_number: paymentNumber,
        amount: paymentAmount,
        payment_date: today,
        payment_method: data.paymentMethod,
        payment_account: data.paymentAccount?.trim() || null,
        reference_number: data.referenceNumber?.trim() || null,
        paid_by: staff.id,
        shift_id: shiftId,
        notes: data.notes?.trim() || null,
      })
      .select("id, payment_number")
      .single();

    if (payErr) throw payErr;

    // Deduct from petty cash fund
    if (data.paymentMethod === "petty_cash" && exp.branch_id) {
      const { data: fund } = await supabase
        .from("petty_cash_funds")
        .select("id, current_balance")
        .eq("branch_id", exp.branch_id)
        .maybeSingle();

      if (fund) {
        await supabase
          .from("petty_cash_funds")
          .update({
            current_balance: Math.max(0, Number(fund.current_balance) - paymentAmount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", fund.id);
      }
    }

    // Record drawer disbursement in shift
    if (data.paymentMethod === "cashier_drawer" && shiftId) {
      const { data: shiftData } = await supabase
        .from("cashier_shifts")
        .select("id, cash_disbursements")
        .eq("id", shiftId)
        .single();

      if (shiftData) {
        await supabase
          .from("cashier_shifts")
          .update({
            cash_disbursements: (shiftData.cash_disbursements || 0) + Math.round(paymentAmount),
            updated_at: new Date().toISOString(),
          })
          .eq("id", shiftId);
      }
    }

    // Update expense payment status
    const newTotalPaid = totalValidPaid + paymentAmount;
    const isFullyPaid = newTotalPaid >= targetPayable - 0.01;
    const newStatus = isFullyPaid ? "paid" : "partially_paid";

    await supabase
      .from("expenses")
      .update({
        payment_status: newStatus,
        payment_date: today,
        payment_method: data.paymentMethod,
        approval_status: exp.approval_status === "payment_pending" && isFullyPaid ? "approved" : exp.approval_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.expenseId);

    // Audit logs
    await supabase.from("expense_audit_logs").insert({
      expense_id: data.expenseId,
      actor_id: staff.id,
      action: "EXPENSE_PAYMENT_RECORDED",
      notes: `Recorded payment of ₱${paymentAmount.toFixed(2)} (${data.paymentMethod}) by ${staff.fullName}`,
      details: {
        payment_number: newPayment.payment_number,
        amount: paymentAmount,
        shift_id: shiftId,
        payment_status: newStatus,
      },
    });

    await supabase.from("audit_logs").insert({
      action: "EXPENSE_PAYMENT_RECORDED",
      resource_type: "expenses",
      resource_id: data.expenseId,
      user_id: staff.id,
      branch_id: exp.branch_id,
      metadata: {
        payment_number: newPayment.payment_number,
        amount: paymentAmount,
        expense_number: exp.expense_number,
      },
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/shifts");
    return { success: true, paymentId: newPayment.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record payment";
    return { success: false, error: message };
  }
}

// 7. REVERSE PAYMENT
export async function reversePayment(paymentId: string, reason: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: "A reversal reason is required." };
    }

    if (!["super_admin", "admin", "manager"].includes(staff.role)) {
      return { success: false, error: "Unauthorized to reverse financial payments." };
    }

    const { data: payment, error: payErr } = await supabase
      .from("expense_payments")
      .select("id, expense_id, amount, payment_method, shift_id, is_reversed")
      .eq("id", paymentId)
      .single();

    if (payErr || !payment) return { success: false, error: "Payment record not found." };
    if (payment.is_reversed) return { success: false, error: "Payment has already been reversed." };

    const { data: exp } = await supabase
      .from("expenses")
      .select("id, expense_number, total_amount, approved_amount, branch_id")
      .eq("id", payment.expense_id)
      .single();

    const now = new Date().toISOString();

    // Mark payment reversed
    await supabase
      .from("expense_payments")
      .update({
        is_reversed: true,
        reversed_at: now,
        reversed_by: staff.id,
        reversal_reason: reason.trim(),
      })
      .eq("id", paymentId);

    // Refund petty cash fund if it was petty cash
    if (payment.payment_method === "petty_cash" && exp?.branch_id) {
      const { data: fund } = await supabase
        .from("petty_cash_funds")
        .select("id, current_balance")
        .eq("branch_id", exp.branch_id)
        .maybeSingle();

      if (fund) {
        await supabase
          .from("petty_cash_funds")
          .update({
            current_balance: Number(fund.current_balance) + Number(payment.amount),
            updated_at: now,
          })
          .eq("id", fund.id);
      }
    }

    // Reconcile cashier shift if drawer disbursement
    if (payment.payment_method === "cashier_drawer" && payment.shift_id) {
      const { data: shiftData } = await supabase
        .from("cashier_shifts")
        .select("id, cash_disbursements")
        .eq("id", payment.shift_id)
        .single();

      if (shiftData) {
        await supabase
          .from("cashier_shifts")
          .update({
            cash_disbursements: Math.max(0, (shiftData.cash_disbursements || 0) - Math.round(payment.amount)),
            updated_at: now,
          })
          .eq("id", payment.shift_id);
      }
    }

    // Recalculate remaining payments for the expense
    const { data: remainingPayments } = await supabase
      .from("expense_payments")
      .select("amount")
      .eq("expense_id", payment.expense_id)
      .eq("is_reversed", false);

    const newTotalPaid = (remainingPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const targetPayable = exp?.approved_amount || exp?.total_amount || 0;
    const newStatus = newTotalPaid <= 0 ? "unpaid" : newTotalPaid >= targetPayable ? "paid" : "partially_paid";

    await supabase
      .from("expenses")
      .update({
        payment_status: newStatus,
        updated_at: now,
      })
      .eq("id", payment.expense_id);

    // Audit logs
    await supabase.from("expense_audit_logs").insert({
      expense_id: payment.expense_id,
      actor_id: staff.id,
      action: "EXPENSE_PAYMENT_REVERSED",
      notes: `Reversed payment of ₱${Number(payment.amount).toFixed(2)} by ${staff.fullName}. Reason: ${reason.trim()}`,
      details: { payment_id: paymentId, amount: payment.amount, reason: reason.trim() },
    });

    await supabase.from("audit_logs").insert({
      action: "EXPENSE_PAYMENT_REVERSED",
      resource_type: "expenses",
      resource_id: payment.expense_id,
      user_id: staff.id,
      branch_id: exp?.branch_id,
      metadata: { payment_id: paymentId, amount: payment.amount, reason: reason.trim() },
    });

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reverse payment";
    return { success: false, error: message };
  }
}

// 8. DELETE EXPENSE (Draft or Rejected only)
export async function deleteExpense(expenseId: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: exp, error: fetchErr } = await supabase
      .from("expenses")
      .select("id, expense_number, approval_status, payment_status, branch_id")
      .eq("id", expenseId)
      .single();

    if (fetchErr || !exp) return { success: false, error: "Expense not found." };

    if (exp.payment_status === "paid" || exp.payment_status === "partially_paid") {
      return { success: false, error: "Paid or partially-paid expenses cannot be deleted." };
    }

    if (exp.approval_status === "approved") {
      return { success: false, error: "Approved expenses cannot be deleted. Archive or reject instead." };
    }

    const { error: delErr } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (delErr) throw delErr;

    await supabase.from("audit_logs").insert({
      action: "EXPENSE_DELETED",
      resource_type: "expenses",
      resource_id: expenseId,
      user_id: staff.id,
      branch_id: exp.branch_id,
      metadata: { expense_number: exp.expense_number },
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete expense";
    return { success: false, error: message };
  }
}

// 9. SAVE CATEGORY (Create or Edit)
export async function saveCategory(data: {
  id?: string;
  name: string;
  description?: string;
  color: string;
  requires_receipt?: boolean;
  requires_approval?: boolean;
  is_active?: boolean;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    if (!["super_admin", "admin"].includes(staff.role)) {
      return { success: false, error: "Administrator privileges required to manage expense categories." };
    }

    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      color: data.color || "#4F46E5",
      requires_receipt: !!data.requires_receipt,
      requires_approval: data.requires_approval !== undefined ? !!data.requires_approval : true,
      is_active: data.is_active !== undefined ? !!data.is_active : true,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await supabase
        .from("expense_categories")
        .update(payload)
        .eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("expense_categories")
        .insert(payload);
      if (error) throw error;
    }

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save category";
    return { success: false, error: message };
  }
}

// 10. REPLENISH PETTY CASH
export async function replenishPettyCash(
  branchId: string,
  amount: number,
  notes?: string
) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const addAmount = Math.round(Number(amount) * 100) / 100;
    if (addAmount <= 0) return { success: false, error: "Replenishment amount must be greater than ₱0.00." };

    const { data: fund } = await supabase
      .from("petty_cash_funds")
      .select("id, current_balance, target_float")
      .eq("branch_id", branchId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (fund) {
      const newBal = Number(fund.current_balance) + addAmount;
      await supabase
        .from("petty_cash_funds")
        .update({
          current_balance: newBal,
          last_replenished_at: now,
          updated_at: now,
        })
        .eq("id", fund.id);
    } else {
      await supabase.from("petty_cash_funds").insert({
        branch_id: branchId,
        current_balance: addAmount,
        target_float: 5000.0,
        last_replenished_at: now,
      });
    }

    await supabase.from("audit_logs").insert({
      action: "PETTY_CASH_REPLENISHED",
      resource_type: "petty_cash_funds",
      user_id: staff.id,
      branch_id: branchId,
      metadata: { amount: addAmount, notes: notes || null },
    });

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to replenish petty cash";
    return { success: false, error: message };
  }
}

// 11. UPLOAD RECEIPT ATTACHMENT
export async function uploadReceiptAttachment(expenseId: string, formData: FormData) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "pdf"];
    if (!ext || !allowed.includes(ext)) {
      return { success: false, error: "Only JPG, PNG, WEBP, and PDF files are allowed" };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "File exceeds maximum size of 10MB" };
    }

    const fileName = `${expenseId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("expense-receipts")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("expense-receipts")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Insert into attachments table
    await supabase.from("expense_attachments").insert({
      expense_id: expenseId,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: staff.id,
    });

    // Also update shortcut receipt_url on expense if empty
    await supabase
      .from("expenses")
      .update({ receipt_url: publicUrl })
      .eq("id", expenseId)
      .is("receipt_url", null);

    await supabase.from("expense_audit_logs").insert({
      expense_id: expenseId,
      actor_id: staff.id,
      action: "EXPENSE_ATTACHMENT_UPLOADED",
      notes: `Uploaded receipt "${file.name}" by ${staff.fullName}`,
      details: { file_name: file.name, file_size: file.size },
    });

    revalidatePath("/admin/expenses");
    return { success: true, url: publicUrl, fileName: file.name };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload receipt";
    return { success: false, error: message };
  }
}
