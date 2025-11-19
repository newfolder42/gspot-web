"use client";
export default function AccountSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 rounded-md bg-white dark:bg-zinc-900 animate-pulse">
        <div className="h-20 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex-1">
          <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700 mb-2" />
          <div className="h-4 w-1/4 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-md p-4 animate-pulse">
        <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700 mb-3" />
        <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700 mb-2" />
        <div className="h-3 w-5/6 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}
