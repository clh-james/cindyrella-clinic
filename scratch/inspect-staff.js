import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectStaff() {
  const { data: staffList, error } = await supabase
    .from("staff")
    .select("*, roles(name)");
  
  if (error) console.error("Error:", error);
  else console.log("Staff list:", JSON.stringify(staffList, null, 2));
}

inspectStaff();
