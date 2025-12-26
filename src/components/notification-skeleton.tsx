export default function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-md bg-white dark:bg-zinc-800 animate-pulse border border-zinc-200 dark:border-zinc-700"
        >
          <div className="flex items-start gap-3">
            {/* Avatar skeleton */}
            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-600 flex-shrink-0" />
            
            {/* Content skeleton */}
            <div className="flex-1 min-w-0">
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-600 mb-2" />
              <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-600 mb-1" />
              <div className="h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-600" />
            </div>

            {/* Menu skeleton */}
            <div className="h-5 w-5 rounded bg-zinc-200 dark:bg-zinc-600 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
