import NotificationSkeleton from "@/components/notifications/notification-skeleton";

export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-2 py-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="h-6 w-36 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>
      <div className="rounded-lg bg-white dark:bg-zinc-900 ring-1 ring-zinc-100 dark:ring-zinc-800 overflow-hidden">
        <NotificationSkeleton />
      </div>
    </div>
  );
}
