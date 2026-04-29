"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadNotifications, markAllAsRead } from "@/actions/notifications";
import { NotificationType } from "@/types/notification";
import NotificationItem from "./notification-item";
import NotificationSkeleton from "./notification-skeleton";

const PAGE_SIZE = 20;

type Props = {
  userId: number;
  initialNotifications: NotificationType[];
};

export default function NotificationsList({ userId, initialNotifications }: Props) {
  const [notifications, setNotifications] = useState<NotificationType[]>(initialNotifications);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialNotifications.length === PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(initialNotifications.length);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const batch = await loadNotifications(userId, PAGE_SIZE, offsetRef.current);
      setNotifications((prev) => [...prev, ...batch]);
      offsetRef.current += batch.length;
      if (batch.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, userId]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleItemUpdate = (id: string, seen: boolean) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, seen } : n)));
  };

  const handleMarkAllAsRead = async () => {
    const res = await markAllAsRead(userId);
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
    }
  };

  const unseenCount = notifications.reduce((acc, n) => acc + (n.seen ? 0 : 1), 0);

  return (
    <div className="max-w-2xl mx-auto px-2 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">შეტყობინებები</h1>
        {unseenCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
          >
            ყველას წაკითხულად მონიშვნა
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-lg bg-white dark:bg-zinc-900 ring-1 ring-zinc-100 dark:ring-zinc-800 overflow-hidden">
        {notifications.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">შეტყობინებები არ არის</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                userId={userId}
                onUpdate={handleItemUpdate}
              />
            ))}
            {loading && <NotificationSkeleton />}
          </>
        )}
      </div>

      {/* Sentinel for infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-4" />}
    </div>
  );
}
