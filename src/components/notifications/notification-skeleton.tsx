export default function NotificationSkeleton() {
  return (
    <div className="space-y-0">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="relative p-2 px-6 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors animate-pulse"
        >
          {/* Content skeleton */}
          <div className="space-y-1">
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
