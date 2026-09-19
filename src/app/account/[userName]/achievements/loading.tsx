export default function Loading() {
  const railRows = Array.from({ length: 7 }, (_, i) => i);
  const cards = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="space-y-4" role="status" aria-hidden="true">
      {/* Summary card */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-md bg-zinc-200 dark:bg-zinc-700 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        {/* Category rail */}
        <div className="w-32 sm:w-56 shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 animate-pulse">
          {railRows.map((row) => (
            <div key={row} className="px-2.5 py-2 space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-2 w-6 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <div className="h-1 w-full rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="min-w-0 flex-1 flex flex-col gap-3">
          {cards.map((card) => (
            <article
              key={card}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-md bg-zinc-200 dark:bg-zinc-700 shrink-0" />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
