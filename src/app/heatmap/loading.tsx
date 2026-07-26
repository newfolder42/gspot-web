export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto py-4 px-2" role="status" aria-hidden="true">
      <div className="px-2 pb-3 space-y-2">
        <div className="h-7 w-56 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-4 w-72 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>
      <div className="h-[70vh] min-h-[380px] w-full rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
    </div>
  );
}
