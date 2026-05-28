"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import NotificationSkeleton from "./notification-skeleton";
import NotificationItem from "./notification-item";
import { loadNotifications, markAllAsRead } from "@/actions/notifications";
import { NotificationType } from "@/types/notification";

type Props = {
  user: {
    id: number;
  };
};

export default function NotificationDropdown({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const unseenCount = notifications.reduce((acc, n) => acc + (n.seen ? 0 : 1), 0);

  const getNotifications = useCallback(async (): Promise<NotificationType[]> => {
    try {
      return await loadNotifications(user.id);
    } catch (err) {
      console.error("Failed to load notifications", err);
      return [];
    }
  }, [user.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Prefetch notifications on mount so badge and first open have data
  useEffect(() => {
    let cancelled = false;
    setBadgeLoading(true);
    getNotifications()
      .then((data) => { if (!cancelled) setNotifications(data); })
      .finally(() => { if (!cancelled) setBadgeLoading(false); });
    return () => { cancelled = true; };
  }, [getNotifications]);

  const handleOpen = () => {
    if (!open) {
      setLoading(true);
      setOpen(true);
      getNotifications()
        .then(setNotifications)
        .finally(() => setLoading(false));
    } else {
      setOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await markAllAsRead(user.id);
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const handleItemUpdate = (id: string, seen: boolean) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, seen } : n)));
  };

  return (
    <div className="relative" ref={ref}>
      {/* Notification Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        aria-label="notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {loading || badgeLoading ? (
          <span className="absolute top-1 right-1 h-3 w-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin transform translate-x-1/2 -translate-y-1/2" />
        ) : unseenCount > 0 ? (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-teal-600 rounded-full">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        ) : null}
      </button>

      {/* Notification Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-96 rounded-lg bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-100 dark:ring-zinc-800">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">შეტყობინებები</h2>
            <div className="flex items-center gap-2">
              {!(loading || unseenCount === 0) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center justify-center rounded-md text-zinc-500 dark:text-zinc-400 cursor-pointer"
                  aria-label="mark all as read"
                  title="მონიშნე ყველა წაკითხულად"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <NotificationSkeleton />
            ) : notifications.length > 0 ? (
              <div className="space-y-0">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    userId={user.id}
                    onUpdate={handleItemUpdate}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">შეტყობინებები არ არის</p>
              </div>
            )}
          </div>

          {/* Footer: see all */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-b-lg">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-teal-600 dark:text-teal-400 hover:underline"
            >
              ყველას ნახვა
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
