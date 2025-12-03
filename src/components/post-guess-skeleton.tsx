export default function PostGuessSkeleton() {
  return (
    <div
      role="status"
      aria-hidden="true"
      className="p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 animate-pulse"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="mt-2 h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}
