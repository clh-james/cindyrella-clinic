"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function upsertTreatment(formData: FormData) {
  await requireStaff();
  
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const duration_minutes = formData.get("duration_minutes") ? parseInt(formData.get("duration_minutes") as string) : null;
  const session_price = parseFloat(formData.get("session_price") as string);
  const five_plus_one_price = formData.get("five_plus_one_price") ? parseFloat(formData.get("five_plus_one_price") as string) : null;
  const ten_plus_two_price = formData.get("ten_plus_two_price") ? parseFloat(formData.get("ten_plus_two_price") as string) : null;
  const is_active = formData.get("is_active") === "true";
  const sort_order = parseInt(formData.get("sort_order") as string || "0");

  // Handler, commission and quota fields
  const handled_by = (formData.get("handled_by") as string) || null;
  const commission_rate = formData.get("commission_rate") ? parseFloat(formData.get("commission_rate") as string) : 10;
  const commission_type = (formData.get("commission_type") as string) || "percentage";
  const quota_target = formData.get("quota_target") ? parseInt(formData.get("quota_target") as string) : 0;

  const remove_image = formData.get("remove_image") === "true";
  const file = formData.get("image") as File | null;
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const supabase = createAdminClient();

  let new_image_url: string | null = null;
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${slug}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('service-images')
      .upload(fileName, file);

    if (uploadError) {
      return { error: `Image upload failed: ${uploadError.message}` };
    }
    
    const { data } = supabase.storage.from('service-images').getPublicUrl(fileName);
    new_image_url = data.publicUrl;
  }

  let old_image_path: string | null = null;
  if (id) {
    const { data: existing } = await supabase.from("treatments").select("image_url").eq("id", id).single();
    if (existing?.image_url && (remove_image || new_image_url)) {
      const parts = existing.image_url.split('/service-images/');
      if (parts.length > 1) old_image_path = parts[1];
    }
  }

  // Base payload
  const corePayload: Record<string, unknown> = {
    name,
    slug,
    category,
    duration_minutes,
    session_price,
    five_plus_one_price,
    ten_plus_two_price,
    is_active,
    sort_order,
  };

  if (new_image_url) {
    corePayload.image_url = new_image_url;
  } else if (remove_image) {
    corePayload.image_url = null;
  }

  // Try full payload with handler & quota columns
  const fullPayload: Record<string, unknown> = {
    ...corePayload,
    handled_by,
    commission_rate,
    commission_type,
    quota_target,
  };

  let savedTreatmentId: string | null = id;

  if (id) {
    const { error: fullUpdateErr } = await supabase.from("treatments").update(fullPayload).eq("id", id);
    if (fullUpdateErr) {
      // Fallback to core payload if columns not yet migrated
      const { error: coreErr } = await supabase.from("treatments").update(corePayload).eq("id", id);
      if (coreErr) return { error: coreErr.message };
    }
  } else {
    const { data: fullInsertData, error: fullInsertErr } = await supabase.from("treatments").insert(fullPayload).select("id").single();
    if (fullInsertErr) {
      // Fallback to core payload if columns not yet migrated
      const { data: coreData, error: coreErr } = await supabase.from("treatments").insert(corePayload).select("id").single();
      if (coreErr) return { error: coreErr.message };
      savedTreatmentId = coreData?.id || null;
    } else {
      savedTreatmentId = fullInsertData?.id || null;
    }
  }

  // Always persist handler, commission, and quota into payroll_settings for instant reliability
  if (savedTreatmentId) {
    try {
      const { data: settingsRow } = await supabase
        .from("payroll_settings")
        .select("value")
        .eq("key", "service_quotas")
        .maybeSingle();

      const currentMap = (settingsRow?.value || {}) as Record<string, unknown>;
      currentMap[savedTreatmentId] = {
        handled_by,
        commission_rate,
        commission_type,
        quota_target,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("payroll_settings")
        .upsert({
          key: "service_quotas",
          value: currentMap,
          description: "Service quota targets, commission rates, and assigned therapists",
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
    } catch (settErr) {
      console.error("Failed to sync service_quotas setting:", settErr);
    }
  }

  if (old_image_path) {
    await supabase.storage.from('service-images').remove([old_image_path]);
  }

  revalidatePath("/admin/services");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/payroll");
  return { success: true };
}

export async function deleteTreatment(id: string) {
  await requireStaff();
  
  const supabase = createAdminClient();
  const { error } = await supabase.from("treatments").delete().eq("id", id);
  
  if (error) {
    return { error: error.message };
  }

  // Also remove from service_quotas in payroll_settings
  try {
    const { data: settingsRow } = await supabase
      .from("payroll_settings")
      .select("value")
      .eq("key", "service_quotas")
      .maybeSingle();

    if (settingsRow?.value && (settingsRow.value as Record<string, unknown>)[id]) {
      const updatedMap = { ...(settingsRow.value as Record<string, unknown>) };
      delete updatedMap[id];
      await supabase
        .from("payroll_settings")
        .update({ value: updatedMap, updated_at: new Date().toISOString() })
        .eq("key", "service_quotas");
    }
  } catch (err) {
    console.error("Failed to clean up service_quotas on delete:", err);
  }

  revalidatePath("/admin/services");
  return { success: true };
}

export async function saveBulkServiceQuotas(
  quotas: Record<string, {
    handled_by?: string | null;
    commission_rate?: number;
    quota_target?: number;
    commission_type?: "percentage" | "fixed";
  }>
) {
  await requireStaff();
  const supabase = createAdminClient();

  try {
    const { data: settingsRow } = await supabase
      .from("payroll_settings")
      .select("value")
      .eq("key", "service_quotas")
      .maybeSingle();

    const currentMap = (settingsRow?.value || {}) as Record<string, unknown>;
    const mergedMap = { ...currentMap, ...quotas };

    const { error: settErr } = await supabase
      .from("payroll_settings")
      .upsert({
        key: "service_quotas",
        value: mergedMap,
        description: "Service quota targets, commission rates, and assigned therapists",
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (settErr) throw settErr;

    // Also attempt updating treatments columns
    for (const [treatmentId, q] of Object.entries(quotas)) {
      await supabase
        .from("treatments")
        .update({
          handled_by: q.handled_by || null,
          commission_rate: q.commission_rate ?? 10,
          commission_type: q.commission_type ?? "percentage",
          quota_target: q.quota_target ?? 0,
        })
        .eq("id", treatmentId);
    }

    revalidatePath("/admin/services");
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update service quotas";
    return { success: false, error: message };
  }
}

export async function autoComputeAllCommissions() {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  try {
    // 1. Fetch service quotas
    const { data: quotasRow } = await supabase
      .from("payroll_settings")
      .select("value")
      .eq("key", "service_quotas")
      .maybeSingle();

    const quotasMap = (quotasRow?.value || {}) as Record<string, {
      handled_by?: string | null;
      commission_rate?: number;
      commission_type?: "percentage" | "fixed";
      quota_target?: number;
    }>;

    // 2. Fetch completed appointments
    const { data: appointments, error: apptErr } = await supabase
      .from("appointments")
      .select("id, reference_number, treatment_id, branch_id, amount_due, appointment_date, status, notes, treatments(name, session_price)")
      .eq("status", "completed");

    if (apptErr) throw apptErr;

    // 3. Fetch active staff
    const { data: staffList } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("is_active", true);

    const staffMap: Record<string, string> = {};
    (staffList || []).forEach(s => { staffMap[s.id] = s.full_name; });

    let createdCount = 0;
    let totalCredited = 0;

    for (const appt of appointments || []) {
      const treatmentConfig = quotasMap[appt.treatment_id] || {};
      
      // Determine handler
      let handlerId = treatmentConfig.handled_by || null;
      if (appt.notes) {
        const match = appt.notes.match(/\[HandledBy:([a-f0-9-]+)\]/i);
        if (match) handlerId = match[1];
      }

      if (!handlerId) continue;

      const treatment = appt.treatments as unknown as { name: string; session_price: number } | null;
      const itemName = treatment?.name || "Clinic Service";
      const baseAmount = Number(appt.amount_due || treatment?.session_price || 0);

      const commRate = Number(treatmentConfig.commission_rate ?? 10);
      const isPercentage = (treatmentConfig.commission_type || "percentage") === "percentage";

      const commAmount = isPercentage
        ? Math.round(baseAmount * (commRate / 100) * 100) / 100
        : Math.round(commRate * 100) / 100;

      if (commAmount <= 0) continue;

      // Check if commission already recorded for this appointment
      const { data: existingComm } = await supabase
        .from("commission_records")
        .select("id")
        .eq("source_id", appt.id)
        .eq("source_type", "appointment")
        .maybeSingle();

      const staffName = staffMap[handlerId] || "Therapist";

      const commPayload = {
        employee_id: handlerId,
        branch_id: appt.branch_id || null,
        source_type: "appointment",
        source_id: appt.id,
        reference_number: appt.reference_number,
        item_name: itemName,
        base_amount: baseAmount,
        commission_rate: commRate,
        is_percentage: isPercentage,
        commission_amount: commAmount,
        split_ratio: 1.0,
        date_earned: appt.appointment_date || new Date().toISOString().slice(0, 10),
        status: "approved",
        notes: `Auto-computed for ${staffName} (Handled service: ${itemName})`,
      };

      if (existingComm) {
        await supabase
          .from("commission_records")
          .update(commPayload)
          .eq("id", existingComm.id);
      } else {
        await supabase
          .from("commission_records")
          .insert(commPayload);
      }

      createdCount++;
      totalCredited += commAmount;
    }

    revalidatePath("/admin/payroll");
    revalidatePath("/admin/services");
    return {
      success: true,
      count: createdCount,
      totalAmount: totalCredited,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error auto-computing commissions";
    return { success: false, error: message };
  }
}
