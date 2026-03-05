export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto my-auto px-2 py-2 md:py-4">
      <article className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800 animate-pulse">
        {/* Header */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="mt-2 h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="mt-1 h-4 w-36 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>

        {/* Image placeholder */}
        <div className="w-full h-[60vh] bg-zinc-200 dark:bg-zinc-800" />

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-8 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
      </article>

      {/* Guess list skeleton */}
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            role="status"
            aria-hidden="true"
            className="p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 animate-pulse"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="mt-2 h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    </main>
  );
}
