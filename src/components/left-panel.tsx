import Link from "next/link";

export default function LeftPanel() {
  return (
    <aside className="hidden md:block px-4 py-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 md:fixed md:left-0 md:top-14 md:h-[calc(100vh-56px)] md:w-56 md:rounded-none md:shadow-sm z-20">
      <nav>
        <ul className="space-y-1">
          <li>
            <Link
              href="/"
              className="block px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              მთავარი
            </Link>
          </li>

          <li>
            <Link
              href="/leaderboard"
              className="block px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              ლიდერბორდი
            </Link>
          </li>

          <li>
            <Link
              href="/new-users"
              className="block px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              მომხმარებლები
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
