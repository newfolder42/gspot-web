export default function SkeletonConnectionCard() {
  return (
    <div role="status" aria-hidden="true" className="flex items-center gap-4 p-3 border rounded-md bg-white dark:bg-zinc-900 animate-pulse">
      <div className="h-12 w-12 rounded-md bg-zinc-200 dark:bg-zinc-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/5 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 w-2/5 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="h-8 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}
