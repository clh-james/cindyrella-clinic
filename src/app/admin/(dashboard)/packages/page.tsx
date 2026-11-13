import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackagesClient } from "./PackagesClient";
import { CustomerPackage, PackageTemplateItem } from "./types";

export const metadata = {
  title: "Packages & Session Credits — Admin",
  description: "Track 5+1 and 10+2 prepaid treatment packages and session balances.",
};

export default async function PackagesPage() {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  // 1. Fetch customer packages
  let customerPackages: CustomerPackage[] = [];
  try {
    const { data: pkgs, error: pkgsErr } = await supabase
      .from("customer_packages")
      .select(`
        *,
        customer:customer_id(id, first_name, last_name, phone, email),
        treatment:treatment_id(id, name, session_price),
        branch:branch_id(id, name)
      `)
      .order("created_at", { ascending: false });

    if (!pkgsErr && pkgs) {
      customerPackages = pkgs as unknown as CustomerPackage[];
    }
  } catch (err) {
    console.error("Failed to load customer packages:", err);
  }

  // 2. Fetch treatment presets (5+1, 10+2, and special packages like Penile 2 Sessions)
  let templates: PackageTemplateItem[] = [];
  let allTreatments: { id: string; name: string; session_price: number; category?: string }[] = [];
  try {
    const { data: treatments } = await supabase
      .from("treatments")
      .select("id, name, session_price, five_plus_one_price, ten_plus_two_price, category")
      .eq("is_active", true)
      .order("name");

    if (treatments) {
      allTreatments = treatments.map((t) => ({
        id: t.id,
        name: t.name,
        session_price: Number(t.session_price || 0),
        category: t.category || "General",
      }));

      templates = treatments
        .map((t) => {
          const isPenileTreatment = t.name.toLowerCase().includes("penile") && !t.name.toLowerCase().includes("medication");
          const presetOptions = isPenileTreatment
            ? [
                {
                  label: "2 Sessions Package",
                  sessions: 2,
                  price: 70000,
                },
              ]
            : undefined;

          return {
            treatment_id: t.id,
            treatment_name: t.name,
            category: t.category || "General",
            session_price: Number(t.session_price || 0),
            five_plus_one_price: t.five_plus_one_price ? Number(t.five_plus_one_price) : null,
            ten_plus_two_price: t.ten_plus_two_price ? Number(t.ten_plus_two_price) : null,
            preset_options: presetOptions,
          };
        })
        .filter((t) => t.five_plus_one_price || t.ten_plus_two_price || (t.preset_options && t.preset_options.length > 0));
    }
  } catch (err) {
    console.error("Failed to load package templates:", err);
  }

  // 3. Fetch customers, branches, and active staff
  const [{ data: customers }, { data: branches }, { data: staffList }] = await Promise.all([
    supabase.from("customers").select("id, first_name, last_name, phone").order("first_name"),
    supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
    supabase.from("staff").select("id, full_name, roles(name)").eq("is_active", true).order("full_name"),
  ]);

  const formattedStaffList = (staffList || []).map((s: any) => {
    const rolesObj = s.roles;
    const roleName = Array.isArray(rolesObj) ? rolesObj[0]?.name : rolesObj?.name;
    return {
      id: s.id,
      full_name: s.full_name,
      role: roleName || "Staff",
    };
  });

  return (
    <PackagesClient
      initialPackages={customerPackages}
      templates={templates}
      allTreatments={allTreatments}
      customers={customers || []}
      branches={branches || []}
      staffList={formattedStaffList}
      currentBranchId={staff.branchId}
    />
  );
}

