export default function Loading() {
  const cards = Array.from({ length: 15 }, (_, i) => i);

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 md:px-4 md:py-8" aria-hidden="true">
      <div className="mb-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="mt-2 h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {cards.map((i) => (
          <div
            key={i}
            className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex gap-2">
              <div className="h-12 w-12 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-700" />

              <div className="min-w-0 flex-1">
                <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mt-2 h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
