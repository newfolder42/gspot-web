export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto" role="status" aria-hidden="true">
      <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="w-full overflow-y-auto">
          <div className="space-y-5 p-6 animate-pulse">
            <div className="flex justify-between items-center mb-4">
              <div className="h-7 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div>
              <div className="space-y-3">
                <div>
                  <div className="h-4 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-1 h-10 w-full rounded-md bg-zinc-200 dark:bg-zinc-700" />
                </div>

                <div>
                  <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-1 h-10 w-full rounded-md bg-zinc-200 dark:bg-zinc-700" />
                </div>

                <div>
                  <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="mt-1 h-10 w-full rounded-md bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            </div>

            <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-md">
              <div className="space-y-2 mb-4">
                <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-11/12 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-10/12 rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <div className="h-20 w-full rounded-md bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="h-[400px] w-full rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-[320px] w-full rounded bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex justify-end">
              <div className="h-9 w-24 rounded-md bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}