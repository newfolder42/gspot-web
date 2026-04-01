export default function Loading() {
  const guessItems = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="">
      {/* Header with sort buttons and total */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-9 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Guess items list */}
      <div className="grid" role="status" aria-hidden="true">
        {guessItems.map((idx) => (
          <div
            key={idx}
            className="p-4 border-b border-zinc-200 dark:border-zinc-800 animate-pulse"
          >
            <div className="flex-1">
              <div className="flex items-start gap-3">
                {/* Main content */}
                <div className="flex-1 space-y-3">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-baseline gap-4">
                    <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
