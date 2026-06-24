export default function Loading() {
  const questItems = Array.from({ length: 3 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="h-6 w-1/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />

      <div className="space-y-3" role="status" aria-hidden="true">
        {questItems.map((idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-pulse"
          >
            <div className="h-10 w-10 rounded-md bg-zinc-200 dark:bg-zinc-700 shrink-0" />
            <div className="flex-1 h-4 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
