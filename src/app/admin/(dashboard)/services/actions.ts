"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function upsertTreatment(formData: FormData) {
  await requireStaff(); // Add specific RBAC if needed
  
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const duration_minutes = formData.get("duration_minutes") ? parseInt(formData.get("duration_minutes") as string) : null;
  const session_price = parseFloat(formData.get("session_price") as string);
  const five_plus_one_price = formData.get("five_plus_one_price") ? parseFloat(formData.get("five_plus_one_price") as string) : null;
  const ten_plus_two_price = formData.get("ten_plus_two_price") ? parseFloat(formData.get("ten_plus_two_price") as string) : null;
  const is_active = formData.get("is_active") === "true";
  const sort_order = parseInt(formData.get("sort_order") as string || "0");

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

  const payload: Record<string, unknown> = {
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
    payload.image_url = new_image_url;
  } else if (remove_image) {
    payload.image_url = null;
  }

  let error;

  if (id) {
    const { error: updateError } = await supabase.from("treatments").update(payload).eq("id", id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase.from("treatments").insert(payload);
    error = insertError;
  }

  if (error) {
    return { error: error.message };
  }

  if (old_image_path) {
    await supabase.storage.from('service-images').remove([old_image_path]);
  }

  revalidatePath("/admin/services");
  return { success: true };
}

export async function deleteTreatment(id: string) {
  await requireStaff();
  
  const supabase = createAdminClient();
  const { error } = await supabase.from("treatments").delete().eq("id", id);
  
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/services");
  return { success: true };
}
