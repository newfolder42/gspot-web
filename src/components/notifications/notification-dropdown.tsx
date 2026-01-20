"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NotificationSkeleton from "./notification-skeleton";
import { loadNotifications, markAsRead, markAsUnread, NotificationType } from "@/actions/notifications";
import { formatTimePassed } from "@/lib/dates";

type Props = {
  user: {
    userId: number;
    alias: string;
  };
};

export default function NotificationDropdown({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const unseenCount = notifications.reduce((acc, n) => acc + (n.seen ? 0 : 1), 0);

  const getNotifications = useCallback(async (): Promise<NotificationType[]> => {
    try {
      return await loadNotifications(user.userId);
    } catch (err) {
      console.error("Failed to load notifications", err);
      return [];
    }
  }, [user.userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
        setOpenMenuId(null);
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
      .then((data) => {
        if (!cancelled) setNotifications(data);
      })
      .finally(() => {
        if (!cancelled) setBadgeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getNotifications]);

  // Simulate loading notifications
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

  const handleNotificationClick = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.seen) {
      await handleMarkAsRead(notificationId);
    }
    setOpen(false);
    setOpenMenuId(null);
  };

  const handleMenuToggle = (notificationId: string) => {
    setOpenMenuId(openMenuId === notificationId ? null : notificationId);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await markAsRead(user.userId, notificationId);
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, seen: true } : n))
        );
        setOpenMenuId(null);
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      const res = await markAsUnread(user.userId, notificationId);
      if (res.ok) {
        // Update local state to mark as unread
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, seen: false } : n))
        );
        setOpenMenuId(null);
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Notification Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        aria-label="notifications"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Notification badge / loading spinner */}
        {loading || badgeLoading ? (
          <span className="absolute top-1 right-1 h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin transform translate-x-1/2 -translate-y-1/2" />
        ) : unseenCount > 0 ? (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-blue-600 rounded-full">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        ) : null}
      </button>

      {/* Notification Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-96 rounded-lg bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-100 dark:ring-zinc-800 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              შეტყობინებები
            </h2>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto p-3">
            {loading ? (
              <NotificationSkeleton />
            ) : notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div key={notification.id} className="relative group p-2 px-6 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                    {/* Unseen indicator */}
                    {!notification.seen && (
                      <span className="absolute left-2 top-4 h-2 w-2 rounded-full bg-blue-600 z-10" />
                    )}

                    <div
                      onClick={() => {
                        const route = notification.getRoute();
                        if (route) {
                          router.push(route);
                        }
                        handleNotificationClick(notification.id);
                      }}
                    >
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 mt-1 line-clamp-2">
                        {notification.getContent()}
                      </p>
                    </div>

                    {/* Timestamp */}
                    {notification.timestamp && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        {formatTimePassed(notification.timestamp)}
                      </p>
                    )}

                    {/* Three-dots action trigger moved into dropdown wrapper */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMenuToggle(notification.id); }}
                      className="absolute right-2 top-2 p-1 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer z-20"
                      aria-label="notification menu"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M6 12a2 2 0 11-4 0 2 2 0 014 0zM12 12a2 2 0 11-4 0 2 2 0 014 0zM16 14a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>
                    {/* Notification menu */}
                    {openMenuId === notification.id && (
                      <div className="absolute right-2 top-8 w-48 rounded-md bg-white dark:bg-zinc-900 shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800 z-30">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notification.seen)
                                handleMarkAsUnread(notification.id);
                              else
                                handleMarkAsRead(notification.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                          >
                            {notification.seen ? "მონიშნე წაუკითხავად" : "მონიშნე წაკითხულად"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  შეტყობინებები არ არის
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {/* {notifications.length > 0 && !loading && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2">
              <button className="w-full text-sm text-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 py-1 transition-colors">
                ყველას ნახვა
              </button>
            </div>
          )} */}
        </div>
      )}
    </div>
  );
}
