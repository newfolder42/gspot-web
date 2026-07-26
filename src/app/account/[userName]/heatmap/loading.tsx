export default function Loading() {
  return (
    <div className="space-y-3" role="status" aria-hidden="true">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>
      <div className="h-[70vh] min-h-[380px] w-full rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
    </div>
  );
}
