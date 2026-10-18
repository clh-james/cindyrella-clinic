// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Server Actions for Bills Due, Payments, Approvals, Recurring Rules & Reminders
// ==============================================================================

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  BillFormData,
  BillPaymentFormData,
  RecurringTemplateFormData,
  BillReminderSettings,
} from "./types";
import {
  roundCurrency,
  deriveBillStatus,
  calculateOutstandingBalance,
  computeValidPaymentsTotal,
  formatPHP,
} from "@/lib/bills/bill-calculator";
import { syncBillToExpense, syncBillPaymentToExpense, reverseLinkedExpensePayment } from "@/lib/bills/expense-bridge";
import { runReminderAutomation } from "@/lib/bills/reminder-engine";
import { generateRecurringBills } from "@/lib/bills/recurring-generator";

function generateBillNumber(): string {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BILL-${ym}-${rand}`;
}

function generatePaymentNumber(): string {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7).replace("-", "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BPAY-${ym}-${rand}`;
}

/**
 * 1. REGISTER A NEW BILL
 */
export async function registerBill(formData: BillFormData) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // Branch enforcement for non-super admins
    let targetBranchId = formData.branch_id;
    if (staff.role !== "super_admin" && staff.role !== "admin") {
      targetBranchId = staff.branchId || formData.branch_id;
    }

    if (!targetBranchId) {
      return { success: false, error: "Please specify an authorized clinic branch." };
    }

    // Validation
    if (!formData.title?.trim()) {
      return { success: false, error: "Bill description / name is required." };
    }
    if (!formData.vendor_or_payee?.trim()) {
      return { success: false, error: "Vendor or provider name is required." };
    }
    if (!formData.category_id) {
      return { success: false, error: "Please select an expense / bill category." };
    }
    if (!formData.due_date) {
      return { success: false, error: "Due date is required." };
    }

    const amountBeforeTax = Math.max(0, roundCurrency(Number(formData.amount_before_tax || 0)));
    const taxAmount = Math.max(0, roundCurrency(Number(formData.tax_amount || 0)));
    const totalAmount = roundCurrency(Number(formData.total_amount || amountBeforeTax + taxAmount));

    if (totalAmount <= 0) {
      return { success: false, error: "Total bill amount must be greater than ₱0.00." };
    }

    const billNumber = generateBillNumber();
    const issueDate = formData.issue_date || new Date().toISOString().slice(0, 10);
    const initialStatus = deriveBillStatus({
      dueDate: formData.due_date,
      totalAmount,
      amountPaid: 0,
    });

    const reminderSchedule = {
      stages: formData.reminder_stages && formData.reminder_stages.length > 0
        ? formData.reminder_stages
        : ["7_days", "3_days", "1_day", "due_date", "overdue"],
    };

    const insertPayload = {
      bill_number: billNumber,
      title: formData.title.trim(),
      category_id: formData.category_id,
      vendor_or_payee: formData.vendor_or_payee.trim(),
      branch_id: targetBranchId,
      invoice_number: formData.invoice_number?.trim() || null,
      billing_period: formData.billing_period?.trim() || null,
      issue_date: issueDate,
      due_date: formData.due_date,
      amount_before_tax: amountBeforeTax,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: 0.0,
      outstanding_balance: totalAmount,
      payment_method: formData.payment_method || "bank_transfer",
      status: initialStatus,
      approval_status: "approved", // default approved unless workflow specifies approval
      is_recurring: !!formData.is_recurring,
      recurring_rule_id: formData.recurring_rule_id || null,
      responsible_employee_id: formData.responsible_employee_id || staff.id,
      reminder_schedule: reminderSchedule,
      receipt_url: formData.receipt_url || null,
      notes: formData.notes?.trim() || null,
      created_by: staff.id,
    };

    const { data: newBill, error: insertErr } = await supabase
      .from("bills")
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      console.error("[registerBill:insertErr]", insertErr);
      return { success: false, error: insertErr.message };
    }

    // Synchronize to Expenses module to maintain single source of financial truth
    if (formData.create_linked_expense !== false) {
      await syncBillToExpense({
        billId: newBill.id,
        billNumber: newBill.bill_number,
        title: newBill.title,
        categoryId: newBill.category_id,
        vendorOrPayee: newBill.vendor_or_payee,
        branchId: newBill.branch_id,
        invoiceNumber: newBill.invoice_number,
        issueDate: newBill.issue_date,
        dueDate: newBill.due_date,
        amountBeforeTax,
        taxAmount,
        totalAmount,
        paymentMethod: newBill.payment_method,
        responsibleEmployeeId: newBill.responsible_employee_id,
        actorId: staff.id,
        notes: newBill.notes,
      });
    }

    // System audit log
    await supabase.from("bill_audit_logs").insert({
      bill_id: newBill.id,
      actor_id: staff.id,
      action: "BILL_CREATED",
      notes: `Registered by ${staff.fullName} for ${formatPHP(totalAmount)} to ${formData.vendor_or_payee} (Due: ${formData.due_date})`,
      details: {
        bill_number: billNumber,
        total_amount: totalAmount,
        due_date: formData.due_date,
        branch_id: targetBranchId,
      },
    });

    revalidatePath("/admin/bills");
    revalidatePath("/admin/expenses");
    return { success: true, billId: newBill.id, billNumber };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[registerBill:fatalError]", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. UPDATE BILL DETAILS
 */
export async function updateBill(id: string, formData: Partial<BillFormData>) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: bill, error: fetchErr } = await supabase
      .from("bills")
      .select("*, payments:bill_payments(*)")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !bill) {
      return { success: false, error: "Bill not found." };
    }

    // Branch authorization
    if (staff.role !== "super_admin" && staff.role !== "admin") {
      if (bill.branch_id && staff.branchId && bill.branch_id !== staff.branchId) {
        return { success: false, error: "You are not authorized to edit bills for this branch." };
      }
    }

    if (bill.status === "cancelled") {
      return { success: false, error: "Cannot edit a cancelled bill." };
    }

    const amountBeforeTax = formData.amount_before_tax !== undefined
      ? Math.max(0, roundCurrency(Number(formData.amount_before_tax)))
      : Number(bill.amount_before_tax);

    const taxAmount = formData.tax_amount !== undefined
      ? Math.max(0, roundCurrency(Number(formData.tax_amount)))
      : Number(bill.tax_amount);

    const totalAmount = formData.total_amount !== undefined
      ? roundCurrency(Number(formData.total_amount))
      : roundCurrency(amountBeforeTax + taxAmount);

    const validPayments = computeValidPaymentsTotal(bill.payments);

    // Prevent changing total amount below already paid amount
    if (totalAmount < validPayments) {
      return {
        success: false,
        error: `Total amount cannot be less than valid payments already recorded (${formatPHP(validPayments)}).`,
      };
    }

    const balance = calculateOutstandingBalance(totalAmount, validPayments);
    const dueDate = formData.due_date || bill.due_date;
    const newStatus = deriveBillStatus({
      dueDate,
      totalAmount,
      amountPaid: validPayments,
    });

    const updatePayload: Record<string, unknown> = {
      amount_before_tax: amountBeforeTax,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      outstanding_balance: balance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (formData.title !== undefined) updatePayload.title = formData.title.trim();
    if (formData.category_id !== undefined) updatePayload.category_id = formData.category_id;
    if (formData.vendor_or_payee !== undefined) updatePayload.vendor_or_payee = formData.vendor_or_payee.trim();
    if (formData.invoice_number !== undefined) updatePayload.invoice_number = formData.invoice_number?.trim() || null;
    if (formData.billing_period !== undefined) updatePayload.billing_period = formData.billing_period?.trim() || null;
    if (formData.due_date !== undefined) updatePayload.due_date = formData.due_date;
    if (formData.issue_date !== undefined) updatePayload.issue_date = formData.issue_date;
    if (formData.payment_method !== undefined) updatePayload.payment_method = formData.payment_method;
    if (formData.responsible_employee_id !== undefined) updatePayload.responsible_employee_id = formData.responsible_employee_id;
    if (formData.reminder_stages !== undefined) {
      updatePayload.reminder_schedule = { stages: formData.reminder_stages };
    }
    if (formData.receipt_url !== undefined) updatePayload.receipt_url = formData.receipt_url;
    if (formData.notes !== undefined) updatePayload.notes = formData.notes?.trim() || null;

    const { error: updateErr } = await supabase
      .from("bills")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Sync with linked expense if exists
    if (bill.expense_id) {
      await syncBillToExpense({
        billId: bill.id,
        billNumber: bill.bill_number,
        title: (updatePayload.title as string) || bill.title,
        categoryId: (updatePayload.category_id as string) || bill.category_id,
        vendorOrPayee: (updatePayload.vendor_or_payee as string) || bill.vendor_or_payee,
        branchId: bill.branch_id,
        invoiceNumber: (updatePayload.invoice_number as string) || bill.invoice_number,
        issueDate: (updatePayload.issue_date as string) || bill.issue_date,
        dueDate,
        amountBeforeTax,
        taxAmount,
        totalAmount,
        paymentMethod: (updatePayload.payment_method as string) || bill.payment_method,
        actorId: staff.id,
        notes: (updatePayload.notes as string) || bill.notes,
      });
    }

    await supabase.from("bill_audit_logs").insert({
      bill_id: id,
      actor_id: staff.id,
      action: "BILL_UPDATED",
      notes: `Updated by ${staff.fullName}`,
      details: updatePayload,
    });

    revalidatePath("/admin/bills");
    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. RECORD PAYMENT WORKFLOW
 * Supports full, partial, and multiple payments against a bill.
 * Updates outstanding balance, payment status, dashboard totals, cancels future reminders if paid.
 */
export async function recordBillPayment(paymentData: BillPaymentFormData) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: bill, error: fetchErr } = await supabase
      .from("bills")
      .select("*, payments:bill_payments(*)")
      .eq("id", paymentData.bill_id)
      .maybeSingle();

    if (fetchErr || !bill) {
      return { success: false, error: "Bill not found." };
    }

    if (bill.status === "cancelled") {
      return { success: false, error: "Cannot record payment for a cancelled bill." };
    }

    // Branch authorization
    if (staff.role !== "super_admin" && staff.role !== "admin") {
      if (bill.branch_id && staff.branchId && bill.branch_id !== staff.branchId) {
        return { success: false, error: "Unauthorized: Bill does not belong to your assigned branch." };
      }
    }

    const paymentAmount = roundCurrency(Number(paymentData.amount || 0));
    if (paymentAmount <= 0) {
      return { success: false, error: "Payment amount must be greater than ₱0.00." };
    }

    const currentTotalPaid = computeValidPaymentsTotal(bill.payments);
    const currentBalance = calculateOutstandingBalance(bill.total_amount, currentTotalPaid);

    if (paymentAmount > currentBalance + 0.001) {
      return {
        success: false,
        error: `Payment amount (${formatPHP(paymentAmount)}) exceeds the remaining balance (${formatPHP(currentBalance)}). Overpayments are not permitted.`,
      };
    }

    // Check cashier drawer shift if method is cashier_drawer
    let activeShiftId = paymentData.shift_id || null;
    if (paymentData.payment_method === "cashier_drawer" && !activeShiftId && bill.branch_id) {
      const { data: shift } = await supabase
        .from("cashier_shifts")
        .select("id, status")
        .eq("branch_id", bill.branch_id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!shift) {
        return {
          success: false,
          error: "No active cashier shift is currently open for this branch to disburse cash from the drawer.",
        };
      }
      activeShiftId = shift.id;
    }

    const paymentNumber = generatePaymentNumber();
    const paymentDate = paymentData.payment_date || new Date().toISOString().slice(0, 10);

    // 1. Insert payment into bill_payments
    const { data: paymentRecord, error: payErr } = await supabase
      .from("bill_payments")
      .insert({
        bill_id: bill.id,
        payment_number: paymentNumber,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_method: paymentData.payment_method,
        payment_account: paymentData.payment_account?.trim() || null,
        reference_number: paymentData.reference_number?.trim() || null,
        paid_by: staff.id,
        receipt_url: paymentData.receipt_url || null,
        shift_id: activeShiftId,
        notes: paymentData.notes?.trim() || null,
      })
      .select()
      .single();

    if (payErr) {
      console.error("[recordBillPayment:payErr]", payErr);
      return { success: false, error: payErr.message };
    }

    // 2. Synchronize to expense_payments if linked
    if (bill.expense_id) {
      const expPaymentId = await syncBillPaymentToExpense({
        billPaymentId: paymentRecord.id,
        paymentNumber,
        expenseId: bill.expense_id,
        amount: paymentAmount,
        paymentDate,
        paymentMethod: paymentData.payment_method,
        paymentAccount: paymentData.payment_account,
        referenceNumber: paymentData.reference_number,
        paidBy: staff.id,
        shiftId: activeShiftId,
        notes: paymentData.notes,
      });

      if (expPaymentId) {
        await supabase
          .from("bill_payments")
          .update({ expense_payment_id: expPaymentId })
          .eq("id", paymentRecord.id);
      }
    }

    // 3. Recalculate bill balance and status
    const newTotalPaid = roundCurrency(currentTotalPaid + paymentAmount);
    const newBalance = calculateOutstandingBalance(bill.total_amount, newTotalPaid);
    const isFullyPaid = newBalance <= 0;
    const newStatus = deriveBillStatus({
      dueDate: bill.due_date,
      totalAmount: Number(bill.total_amount),
      amountPaid: newTotalPaid,
    });

    await supabase
      .from("bills")
      .update({
        amount_paid: newTotalPaid,
        outstanding_balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bill.id);

    // 4. Audit Log
    await supabase.from("bill_audit_logs").insert({
      bill_id: bill.id,
      actor_id: staff.id,
      action: "BILL_PAYMENT_RECORDED",
      notes: `Recorded payment of ${formatPHP(paymentAmount)} (${paymentData.payment_method}) by ${staff.fullName}. Remaining: ${formatPHP(newBalance)}`,
      details: {
        payment_id: paymentRecord.id,
        payment_number: paymentNumber,
        amount: paymentAmount,
        payment_method: paymentData.payment_method,
        new_balance: newBalance,
        is_fully_paid: isFullyPaid,
      },
    });

    if (isFullyPaid) {
      await supabase.from("bill_audit_logs").insert({
        bill_id: bill.id,
        actor_id: staff.id,
        action: "BILL_MARKED_PAID",
        notes: `Bill marked fully paid. Future automated payment reminders cancelled.`,
        details: { total_amount: bill.total_amount, total_paid: newTotalPaid },
      });
    }

    revalidatePath("/admin/bills");
    revalidatePath("/admin/expenses");
    return {
      success: true,
      paymentNumber,
      isFullyPaid,
      newBalance,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[recordBillPayment:fatalError]", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. REVERSE PAYMENT WORKFLOW
 * Reverses a recorded payment, recalculates balance, and reactivates reminder schedule.
 */
export async function reverseBillPayment(paymentId: string, reason: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    if (!reason?.trim()) {
      return { success: false, error: "Please provide a valid justification for payment reversal." };
    }

    // Role check: cashier cannot reverse payments (separation of duties)
    if (staff.role === "cashier") {
      return { success: false, error: "Cashiers are not authorized to reverse payments. Please consult a branch manager or administrator." };
    }

    const { data: payment, error: pErr } = await supabase
      .from("bill_payments")
      .select("*, bill:bills(*)")
      .eq("id", paymentId)
      .maybeSingle();

    if (pErr || !payment) {
      return { success: false, error: "Payment record not found." };
    }

    if (payment.is_reversed) {
      return { success: false, error: "This payment has already been reversed." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bill = Array.isArray(payment.bill) ? payment.bill[0] : (payment.bill as any);
    if (!bill) {
      return { success: false, error: "Parent bill record not found." };
    }

    // Mark payment reversed
    await supabase
      .from("bill_payments")
      .update({
        is_reversed: true,
        reversed_at: new Date().toISOString(),
        reversed_by: staff.id,
        reversal_reason: reason.trim(),
      })
      .eq("id", paymentId);

    // Reverse linked expense payment if exists
    if (payment.expense_payment_id) {
      await reverseLinkedExpensePayment({
        expensePaymentId: payment.expense_payment_id,
        reversedBy: staff.id,
        reason: reason.trim(),
      });
    }

    // Fetch all remaining valid payments and recompute
    const { data: remainingPayments } = await supabase
      .from("bill_payments")
      .select("amount, is_reversed")
      .eq("bill_id", bill.id);

    const validPaid = computeValidPaymentsTotal(remainingPayments);
    const newBalance = calculateOutstandingBalance(bill.total_amount, validPaid);
    const newStatus = deriveBillStatus({
      dueDate: bill.due_date,
      totalAmount: Number(bill.total_amount),
      amountPaid: validPaid,
      cancelledAt: bill.cancelled_at,
    });

    await supabase
      .from("bills")
      .update({
        amount_paid: validPaid,
        outstanding_balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bill.id);

    // Audit log
    await supabase.from("bill_audit_logs").insert({
      bill_id: bill.id,
      actor_id: staff.id,
      action: "BILL_PAYMENT_REVERSED",
      notes: `Reversed payment of ${formatPHP(payment.amount)} by ${staff.fullName}. Reason: ${reason.trim()}`,
      details: {
        payment_id: paymentId,
        payment_number: payment.payment_number,
        reversed_amount: payment.amount,
        reversal_reason: reason.trim(),
        new_balance: newBalance,
      },
    });

    revalidatePath("/admin/bills");
    revalidatePath("/admin/expenses");
    return { success: true, newBalance };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. APPROVE BILL
 */
export async function approveBill(billId: string, notes?: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: bill, error: fetchErr } = await supabase
      .from("bills")
      .select("*")
      .eq("id", billId)
      .maybeSingle();

    if (fetchErr || !bill) {
      return { success: false, error: "Bill not found." };
    }

    if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
      return { success: false, error: "Unauthorized: Only managers and administrators can approve bills." };
    }

    await supabase
      .from("bills")
      .update({
        approval_status: "approved",
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", billId);

    await supabase.from("bill_audit_logs").insert({
      bill_id: billId,
      actor_id: staff.id,
      action: "BILL_APPROVED",
      notes: notes || `Approved by ${staff.fullName} for ${formatPHP(bill.total_amount)}`,
      details: { approved_amount: bill.total_amount },
    });

    revalidatePath("/admin/bills");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 6. CANCEL BILL
 * Stops future reminders while preserving payment and audit history.
 */
export async function cancelBill(billId: string, reason: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    if (!reason?.trim()) {
      return { success: false, error: "Please provide a reason for cancelling this bill." };
    }

    if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
      return { success: false, error: "Unauthorized to cancel bills." };
    }

    const { data: bill, error: fetchErr } = await supabase
      .from("bills")
      .select("*")
      .eq("id", billId)
      .maybeSingle();

    if (fetchErr || !bill) {
      return { success: false, error: "Bill not found." };
    }

    await supabase
      .from("bills")
      .update({
        status: "cancelled",
        cancelled_by: staff.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", billId);

    await supabase.from("bill_audit_logs").insert({
      bill_id: billId,
      actor_id: staff.id,
      action: "BILL_CANCELLED",
      notes: `Bill cancelled by ${staff.fullName}. Reason: ${reason.trim()}. Automated reminders stopped.`,
      details: { cancellation_reason: reason.trim() },
    });

    revalidatePath("/admin/bills");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 7. CREATE RECURRING BILL TEMPLATE
 */
export async function createRecurringTemplate(formData: RecurringTemplateFormData) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    if (!formData.template_name?.trim()) {
      return { success: false, error: "Template name is required." };
    }
    if (!formData.vendor_or_payee?.trim()) {
      return { success: false, error: "Vendor / provider is required." };
    }
    if (!formData.category_id) {
      return { success: false, error: "Category is required." };
    }

    const defaultAmt = roundCurrency(Number(formData.default_amount || 0));
    const taxAmt = roundCurrency(Number(formData.tax_amount || 0));

    const reminderSchedule = {
      stages: formData.reminder_stages && formData.reminder_stages.length > 0
        ? formData.reminder_stages
        : ["7_days", "3_days", "1_day", "due_date", "overdue"],
    };

    const { data: template, error: insertErr } = await supabase
      .from("recurring_bill_templates")
      .insert({
        template_name: formData.template_name.trim(),
        category_id: formData.category_id,
        vendor_or_payee: formData.vendor_or_payee.trim(),
        branch_id: formData.branch_id || null,
        frequency: formData.frequency,
        custom_interval_days: formData.custom_interval_days || null,
        default_amount: defaultAmt,
        tax_amount: taxAmt,
        due_date_rule: formData.due_date_rule || "day_of_month",
        due_day_offset: formData.due_day_offset || 15,
        start_date: formData.start_date || new Date().toISOString().slice(0, 10),
        next_billing_date: formData.next_billing_date,
        end_date: formData.end_date || null,
        payment_method: formData.payment_method || "bank_transfer",
        responsible_employee_id: formData.responsible_employee_id || staff.id,
        reminder_schedule: reminderSchedule,
        notes: formData.notes?.trim() || null,
        status: "active",
        auto_generate: true,
        created_by: staff.id,
      })
      .select()
      .single();

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    revalidatePath("/admin/bills");
    return { success: true, templateId: template.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 8. UPDATE RECURRING TEMPLATE
 */
export async function updateRecurringTemplate(id: string, formData: Partial<RecurringTemplateFormData & { status: string }>) {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.template_name !== undefined) updatePayload.template_name = formData.template_name.trim();
    if (formData.category_id !== undefined) updatePayload.category_id = formData.category_id;
    if (formData.vendor_or_payee !== undefined) updatePayload.vendor_or_payee = formData.vendor_or_payee.trim();
    if (formData.branch_id !== undefined) updatePayload.branch_id = formData.branch_id;
    if (formData.frequency !== undefined) updatePayload.frequency = formData.frequency;
    if (formData.default_amount !== undefined) updatePayload.default_amount = roundCurrency(Number(formData.default_amount));
    if (formData.tax_amount !== undefined) updatePayload.tax_amount = roundCurrency(Number(formData.tax_amount));
    if (formData.due_date_rule !== undefined) updatePayload.due_date_rule = formData.due_date_rule;
    if (formData.due_day_offset !== undefined) updatePayload.due_day_offset = formData.due_day_offset;
    if (formData.next_billing_date !== undefined) updatePayload.next_billing_date = formData.next_billing_date;
    if (formData.end_date !== undefined) updatePayload.end_date = formData.end_date || null;
    if (formData.payment_method !== undefined) updatePayload.payment_method = formData.payment_method;
    if (formData.responsible_employee_id !== undefined) updatePayload.responsible_employee_id = formData.responsible_employee_id;
    if (formData.status !== undefined) updatePayload.status = formData.status;
    if (formData.reminder_stages !== undefined) {
      updatePayload.reminder_schedule = { stages: formData.reminder_stages };
    }
    if (formData.notes !== undefined) updatePayload.notes = formData.notes?.trim() || null;

    const { error } = await supabase
      .from("recurring_bill_templates")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/bills");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 9. MANUAL TRIGGER: RUN AUTOMATED REMINDERS NOW
 */
export async function triggerReminderRun() {
  await requireStaff();
  const res = await runReminderAutomation();
  revalidatePath("/admin/bills");
  return res;
}

/**
 * 10. MANUAL TRIGGER: RUN RECURRING BILL GENERATION NOW
 */
export async function triggerRecurringGeneration() {
  await requireStaff();
  const res = await generateRecurringBills();
  revalidatePath("/admin/bills");
  return res;
}

/**
 * 11. UPDATE REMINDER SETTINGS
 */
export async function updateReminderSettings(settings: Partial<BillReminderSettings>) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    if (staff.role !== "super_admin" && staff.role !== "admin") {
      return { success: false, error: "Only administrators can update global reminder settings." };
    }

    const { error } = await supabase
      .from("bill_reminder_settings")
      .upsert(
        {
          branch_id: settings.branch_id || null,
          stages_enabled: settings.stages_enabled,
          overdue_frequency_days: settings.overdue_frequency_days,
          in_app_enabled: settings.in_app_enabled !== false,
          email_enabled: settings.email_enabled !== false,
          sms_enabled: !!settings.sms_enabled,
          notify_branch_managers: settings.notify_branch_managers !== false,
          notify_super_admins: settings.notify_super_admins !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "branch_id" }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/bills");
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 12. IN-APP NOTIFICATIONS HANDLERS
 */
export async function markNotificationRead(notificationId: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  await supabase
    .from("staff_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", staff.id);

  return { success: true };
}

export async function markAllNotificationsRead() {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  await supabase
    .from("staff_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_id", staff.id)
    .eq("is_read", false);

  return { success: true };
}
