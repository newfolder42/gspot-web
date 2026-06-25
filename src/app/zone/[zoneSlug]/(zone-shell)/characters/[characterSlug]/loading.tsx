export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-hidden="true">
      <div className="flex items-start gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="shrink-0 w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-6 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse mt-1" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>
    </div>
  );
}
