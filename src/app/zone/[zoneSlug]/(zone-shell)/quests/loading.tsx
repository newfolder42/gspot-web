export default function Loading() {
  const questItems = Array.from({ length: 4 }, (_, i) => i);

  return (
    <div className="">
      <div className="px-4 py-2 flex items-center justify-end">
        <div className="h-9 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      <div className="space-y-3 px-2" role="status" aria-hidden="true">
        {questItems.map((idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-pulse"
          >
            <div className="h-10 w-10 rounded-md bg-zinc-200 dark:bg-zinc-700 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
