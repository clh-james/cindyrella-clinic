// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Expenses Integration Bridge — Unified Financial Accounting & Anti-Duplication
// ==============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { roundCurrency } from "./bill-calculator";

/**
 * Creates or synchronizes an expense record for a registered bill.
 * Preserves category, branch, vendor, and invoice number.
 * Marks expense as linked accrual (is_accrual = true) so reports avoid double-counting.
 */
export async function syncBillToExpense(params: {
  billId: string;
  billNumber: string;
  title: string;
  categoryId: string;
  vendorOrPayee: string;
  branchId?: string | null;
  invoiceNumber?: string | null;
  issueDate: string;
  dueDate: string;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  responsibleEmployeeId?: string | null;
  actorId?: string | null;
  notes?: string | null;
}): Promise<string | null> {
  const supabase = createAdminClient();

  try {
    // Check if expense record already linked to this bill
    const { data: existingExp } = await supabase
      .from("expenses")
      .select("id")
      .eq("bill_id", params.billId)
      .maybeSingle();

    if (existingExp) {
      // Update existing expense record to match bill details
      await supabase
        .from("expenses")
        .update({
          title: params.title,
          category_id: params.categoryId,
          vendor_or_payee: params.vendorOrPayee,
          branch_id: params.branchId,
          reference_number: params.invoiceNumber || null,
          expense_date: params.issueDate,
          due_date: params.dueDate,
          amount_before_tax: params.amountBeforeTax,
          tax_amount: params.taxAmount,
          total_amount: params.totalAmount,
          amount: params.totalAmount,
          approved_amount: params.totalAmount,
          payment_method: params.paymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingExp.id);

      return existingExp.id;
    }

    // Generate unique expense number linked to bill
    const expNum = `EXP-${params.billNumber.replace("BILL-", "B-")}`;

    const { data: newExp, error } = await supabase
      .from("expenses")
      .insert({
        expense_number: expNum,
        bill_id: params.billId,
        branch_id: params.branchId,
        category_id: params.categoryId,
        title: `[Bill Payable] ${params.title}`,
        description: params.notes || `Linked payable for Bill #${params.billNumber}`,
        vendor_or_payee: params.vendorOrPayee,
        amount_before_tax: params.amountBeforeTax,
        tax_amount: params.taxAmount,
        total_amount: params.totalAmount,
        amount: params.totalAmount,
        approved_amount: params.totalAmount,
        expense_date: params.issueDate,
        due_date: params.dueDate,
        payment_method: params.paymentMethod,
        payment_status: "unpaid",
        approval_status: "approved", // bills follow their own approval lifecycle
        is_accrual: true,
        reference_number: params.invoiceNumber || null,
        requested_by: params.actorId || params.responsibleEmployeeId || null,
        created_by: params.actorId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[expense-bridge:createExpenseWarning]", error.message);
      return null;
    }

    // Update bill record with linked expense_id
    if (newExp?.id) {
      await supabase
        .from("bills")
        .update({ expense_id: newExp.id })
        .eq("id", params.billId);

      return newExp.id;
    }

    return null;
  } catch (err) {
    console.error("[expense-bridge:syncBillToExpenseError]", err);
    return null;
  }
}

/**
 * Synchronizes a bill payment to the linked expense_payments table.
 * Avoids creating duplicate expense records!
 */
export async function syncBillPaymentToExpense(params: {
  billPaymentId: string;
  paymentNumber: string;
  expenseId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentAccount?: string | null;
  referenceNumber?: string | null;
  paidBy?: string | null;
  shiftId?: string | null;
  notes?: string | null;
}): Promise<string | null> {
  const supabase = createAdminClient();

  try {
    // Check if expense payment already exists
    const { data: existingPay } = await supabase
      .from("expense_payments")
      .select("id")
      .eq("payment_number", params.paymentNumber)
      .maybeSingle();

    if (existingPay) {
      return existingPay.id;
    }

    // Insert expense payment
    const { data: expPay, error } = await supabase
      .from("expense_payments")
      .insert({
        expense_id: params.expenseId,
        payment_number: params.paymentNumber,
        amount: roundCurrency(params.amount),
        payment_date: params.paymentDate,
        payment_method: params.paymentMethod,
        payment_account: params.paymentAccount || null,
        reference_number: params.referenceNumber || null,
        paid_by: params.paidBy || null,
        shift_id: params.shiftId || null,
        notes: params.notes ? `[Bill Payment] ${params.notes}` : `[Bill Payment]`,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[expense-bridge:createExpensePaymentWarning]", error.message);
      return null;
    }

    // Recalculate expense payment_status
    const { data: allPayments } = await supabase
      .from("expense_payments")
      .select("amount, is_reversed")
      .eq("expense_id", params.expenseId);

    const validPaid = (allPayments || [])
      .filter((p) => !p.is_reversed)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const { data: expData } = await supabase
      .from("expenses")
      .select("total_amount")
      .eq("id", params.expenseId)
      .maybeSingle();

    const totalAmt = Number(expData?.total_amount || 0);
    const newStatus = validPaid >= totalAmt ? "paid" : validPaid > 0 ? "partially_paid" : "unpaid";

    await supabase
      .from("expenses")
      .update({
        payment_status: newStatus,
        payment_date: params.paymentDate,
        payment_account: params.paymentAccount || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.expenseId);

    return expPay?.id || null;
  } catch (err) {
    console.error("[expense-bridge:syncBillPaymentToExpenseError]", err);
    return null;
  }
}

/**
 * Reverses the corresponding expense payment if a bill payment is reversed.
 */
export async function reverseLinkedExpensePayment(params: {
  expensePaymentId: string;
  reversedBy?: string | null;
  reason: string;
}) {
  const supabase = createAdminClient();

  try {
    await supabase
      .from("expense_payments")
      .update({
        is_reversed: true,
        reversed_at: new Date().toISOString(),
        reversed_by: params.reversedBy || null,
        reversal_reason: params.reason,
      })
      .eq("id", params.expensePaymentId);
  } catch (err) {
    console.error("[expense-bridge:reverseLinkedExpensePaymentError]", err);
  }
}
