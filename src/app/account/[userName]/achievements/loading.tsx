export default function Loading() {
  const categories = Array.from({ length: 3 }, (_, i) => i);
  const cardsPerCategory = 4;

  return (
    <div className="space-y-4">
      {/* Checkbox skeleton */}
      <div className="inline-flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Categories section */}
      <div className="space-y-6">
        {categories.map((categoryIdx) => (
          <section key={categoryIdx} className="space-y-3">
            {/* Category title */}
            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />

            {/* Cards grid */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              role="status"
              aria-hidden="true"
            >
              {Array.from({ length: cardsPerCategory }, (_, cardIdx) => (
                <article
                  key={cardIdx}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 animate-pulse"
                >
                  <div className="flex items-start gap-3">
                    {/* Image placeholder */}
                    <div className="h-12 w-12 rounded-md bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-2">
                      {/* Title + badge row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                        <div className="h-5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      </div>

                      {/* Progress/date row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                        <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
