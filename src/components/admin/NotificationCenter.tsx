// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// In-App Notification Center with Bell Icon Dropdown & Real-Time Reminders
// ==============================================================================

"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Clock, AlertTriangle, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { StaffNotification } from "@/app/admin/(dashboard)/bills/types";
import { markNotificationRead, markAllNotificationsRead } from "@/app/admin/(dashboard)/bills/actions";
import toast from "react-hot-toast";

interface NotificationCenterProps {
  initialNotifications?: StaffNotification[];
  currentStaffId?: string;
}

export function NotificationCenter({
  initialNotifications = [],
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<StaffNotification[]>(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync props
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      await markNotificationRead(id);
    } catch {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await markAllNotificationsRead();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-white bg-rose-600 rounded-full shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-500">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Payment reminders and approval notices will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isOverdue = n.title.includes("OVERDUE");
                const isDueToday = n.title.includes("DUE TODAY");

                return (
                  <div
                    key={n.id}
                    className={`p-3.5 transition-colors flex items-start gap-3 ${
                      n.is_read ? "bg-white opacity-80" : "bg-rose-50/20"
                    } hover:bg-slate-50`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isOverdue
                          ? "bg-red-100 text-red-600"
                          : isDueToday
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-600"
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          className={`text-xs leading-snug line-clamp-1 ${
                            n.is_read
                              ? "font-semibold text-slate-700"
                              : "font-bold text-slate-900"
                          }`}
                        >
                          {n.title}
                        </h4>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          {new Date(n.created_at).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <div className="flex items-center gap-2">
                          {!n.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="font-semibold text-slate-500 hover:text-slate-800"
                            >
                              Mark read
                            </button>
                          )}
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => {
                                handleMarkAsRead(n.id);
                                setIsOpen(false);
                              }}
                              className="font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                            >
                              View Bill
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/admin/bills"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
            >
              Go to Bills Due & Schedules →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
