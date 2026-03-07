import Link from "next/link";
import { HomeIcon, LeaderboardIcon, NewUsersIcon } from "@/components/icons";

export default function LeftPanel() {
  return (
    <aside className="hidden md:block px-4 py-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 md:fixed md:left-0 md:top-14 md:h-[calc(100vh-56px)] md:w-56 md:rounded-none md:shadow-sm z-20">
      <nav>
        <ul className="space-y-1">
          <li>
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <HomeIcon className="w-5 h-5" />
              <span>მთავარი</span>
            </Link>
          </li>

          <li>
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <LeaderboardIcon className="w-5 h-5" />
              <span>ლიდერბორდი</span>
            </Link>
          </li>

          <li>
            <Link
              href="/new-users"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <NewUsersIcon className="w-5 h-5" />
              <span>მომხმარებლები</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
