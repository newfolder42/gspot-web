export default function Loading() {
  const cards = Array.from({ length: 9 }, (_, i) => i);

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 md:px-4 md:py-8" aria-hidden="true">
      {/* Header skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="h-7 w-56 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-2 h-4 w-44 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Zone card grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {cards.map((i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Banner */}
            <div className="relative h-24 rounded-t-2xl bg-zinc-200 dark:bg-zinc-700">
              {/* Overlapping avatar */}
              <div className="absolute bottom-0 left-3 h-10 w-10 translate-y-1/2 rounded-md border-2 border-white bg-zinc-300 dark:border-zinc-900 dark:bg-zinc-600" />
            </div>

            {/* Body */}
            <div className="px-3 pb-3 pt-6">
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="mt-2 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="mt-1 h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-700" />

              {/* Footer row */}
              <div className="mt-4 flex items-center justify-between">
                <div className="h-5 w-14 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
