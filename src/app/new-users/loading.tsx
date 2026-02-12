export default function Loading() {
  const rows = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="max-w-4xl mx-auto px-2 py-2 md:py-4">
      <section
        role="status"
        aria-hidden="true"
        className="bg-white dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-800 p-6 animate-pulse"
      >
        <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
        <div className="h-4 w-56 rounded bg-zinc-200 dark:bg-zinc-700 mb-4" />

        <ol className="space-y-2">
          {rows.map(row => (
            <li key={row}>
              <div className="flex items-center justify-between p-2 rounded-md bg-zinc-50 dark:bg-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                  <div>
                    <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700 mb-2" />
                    <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
