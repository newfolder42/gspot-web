export default function Loading() {
  const objectiveItems = Array.from({ length: 3 }, (_, i) => i);

  return (
    <div className="space-y-4" role="status" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-6 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>

      <div className="h-9 w-32 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />

      <div className="space-y-2">
        {objectiveItems.map((idx) => (
          <div key={idx} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-pulse space-y-2">
            <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
