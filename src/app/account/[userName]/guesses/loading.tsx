function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
      {Array.from({ length: 5 }, (_, i) => i).map((idx) => (
        <div key={idx} className="flex items-start gap-3 border-b border-zinc-200 px-3 py-2.5 last:border-b-0 dark:border-zinc-800">
          <div className="h-9 w-9 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse" role="status" aria-hidden="true">
      {/* Accuracy index panel */}
      <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-56 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => i).map((idx) => (
                <div key={idx} className="space-y-1">
                  <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score distribution chart */}
        <div className="mt-5 space-y-2">
          <div className="h-4 w-36 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-end gap-1" style={{ height: 122 }}>
            {[30, 55, 40, 70, 45, 85, 60, 95, 50, 110].map((height, idx) => (
              <div key={idx} className="flex-1 rounded-t-sm bg-zinc-200 dark:bg-zinc-700" style={{ height }} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ListSkeleton />
        <ListSkeleton />
      </div>
    </div>
  );
}
