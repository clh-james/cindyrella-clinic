"use client";

import { useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  ExternalLink,
  Clock,
  AlertTriangle,
  Receipt,
  Boxes,
  Calendar,
  ShieldAlert,
  Info,
} from "lucide-react";
import { StaffNotificationItem } from "./types";
import {
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllReadNotifications,
} from "./actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NotificationsClientProps {
  initialNotifications: StaffNotificationItem[];
}

export default function NotificationsClient({
  initialNotifications,
}: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<StaffNotificationItem[]>(initialNotifications);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [isProcessing, setIsProcessing] = useState(false);

  useState(() => {
    setNotifications(initialNotifications);
  });

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !n.is_read) ||
      (filter === "read" && n.is_read);

    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationAsRead(id);
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    setIsProcessing(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllAsRead();
    setIsProcessing(false);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
    router.refresh();
  };

  const handleClearRead = async () => {
    if (!window.confirm("Are you sure you want to remove all read notifications?")) {
      return;
    }
    setIsProcessing(true);
    setNotifications((prev) => prev.filter((n) => !n.is_read));
    await clearAllReadNotifications();
    setIsProcessing(false);
    router.refresh();
  };

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("bill") || t.includes("expense") || t.includes("payment")) {
      return <Receipt className="h-5 w-5 text-amber-600" />;
    }
    if (t.includes("inventory") || t.includes("stock")) {
      return <Boxes className="h-5 w-5 text-purple-600" />;
    }
    if (t.includes("appointment") || t.includes("booking")) {
      return <Calendar className="h-5 w-5 text-blue-600" />;
    }
    if (t.includes("variance") || t.includes("shift") || t.includes("security")) {
      return <ShieldAlert className="h-5 w-5 text-rose-600" />;
    }
    return <Info className="h-5 w-5 text-royal" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
              <Bell className="h-7 w-7 text-royal" />
              Notifications Center
            </h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-ink-soft mt-1">
            System alerts, inventory warnings, bill reminders, and booking notifications.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-mist transition-all disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" />
              Mark all as read
            </button>
          )}

          <button
            onClick={handleClearRead}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear read
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line pl-10 pr-4 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(["all", "unread", "read"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === mode
                  ? "bg-royal text-white shadow-sm"
                  : "bg-mist/50 text-ink-soft hover:bg-mist hover:text-ink"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Feed */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden divide-y divide-line">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-ink-soft/30 mb-3" />
            <h3 className="text-base font-semibold text-ink">No notifications</h3>
            <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matched "${searchQuery}".`
                : "You're all caught up! There are no pending notifications at this time."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                !notification.is_read
                  ? "bg-royal/[0.02] border-l-4 border-l-royal"
                  : "hover:bg-mist/30"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist/60 border border-line">
                  {getTypeIcon(notification.type)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm ${
                        !notification.is_read ? "font-bold text-ink" : "font-semibold text-ink/80"
                      }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-royal" />
                    )}
                  </div>

                  <p className="text-xs text-ink/70 mt-1 leading-relaxed">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-soft">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(notification.created_at).toLocaleString()}
                    </span>

                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="inline-flex items-center gap-1 font-semibold text-royal hover:underline"
                      >
                        View Details <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    className="p-1.5 rounded-lg text-ink-soft hover:bg-mist hover:text-royal transition-colors"
                    title="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(notification.id)}
                  className="p-1.5 rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

