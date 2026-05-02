export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto my-auto px-2 py-2 md:py-4">
      <article className="animate-pulse">
        {/* Header */}
        <div className="flex items-start p-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              {/* zone avatar + slug */}
              <div className="w-4 h-4 rounded-sm bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
              <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-1 rounded bg-zinc-200 dark:bg-zinc-700" />
              {/* author */}
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-1 rounded bg-zinc-200 dark:bg-zinc-700" />
              {/* date */}
              <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="mt-1.5 h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>

        {/* Image placeholder */}
        <div className="w-full h-[60vh] bg-zinc-200 dark:bg-zinc-800" />
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
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="mt-2 h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    </main>
  );
}
