export default function Loading() {
  const cards = Array.from({ length: 9 }, (_, i) => i);

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 md:px-4 md:py-8" aria-hidden="true">
      {/* Header skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-2 h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {cards.map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:p-4"
          >
            {/* Avatar */}
            <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 sm:h-14 sm:w-14" />
            {/* Text */}
            <div className="min-w-0 flex-1">
              <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="mt-1.5 h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="ml-auto grid w-14 gap-1.5">
              <div className="h-7 rounded-md bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-7 rounded-md bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-7 rounded-md bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
