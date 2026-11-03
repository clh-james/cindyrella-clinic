import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import NotificationsClient from "./NotificationsClient";
import { StaffNotificationItem } from "./types";

export const metadata = {
  title: "Notifications Center — Admin",
  description: "System notifications, low stock warnings, and clinic alerts.",
};

export default async function NotificationsPage() {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  let notifications: StaffNotificationItem[] = [];

  try {
    const { data: dbNotifications } = await supabase
      .from("staff_notifications")
      .select("*")
      .or(`recipient_id.eq.${staff.id},recipient_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (dbNotifications) {
      notifications = dbNotifications as unknown as StaffNotificationItem[];
    }
  } catch (err) {
    console.warn("Failed to load staff notifications:", err);
  }

  // If list is empty, also check for any real-time alerts (low stock or unpaid bills) to populate live alerts
  if (notifications.length === 0) {
    try {
      const { data: lowStockItems } = await supabase
        .from("inventory_items")
        .select("id, name, current_stock, low_stock_threshold")
        .filter("current_stock", "lte", 5)
        .limit(3);

      if (lowStockItems && lowStockItems.length > 0) {
        for (const item of lowStockItems) {
          notifications.push({
            id: `stock-${item.id}`,
            recipient_id: staff.id,
            title: `Low Stock Warning: ${item.name}`,
            message: `Current stock has fallen to ${item.current_stock} units. Please restock soon.`,
            type: "inventory_low_stock",
            link: "/admin/inventory",
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (stockErr) {
      console.warn("Low stock inspection skipped:", stockErr);
    }
  }

  return <NotificationsClient initialNotifications={notifications} />;
}

