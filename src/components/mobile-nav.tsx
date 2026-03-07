"use client";

import Link from "next/link";
import { HomeIcon, LeaderboardIcon, UsersIcon } from "@/components/icons";

type MobileNavProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function MobileNav({ open, setOpen }: MobileNavProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      </div>

      <aside className="fixed left-0 top-0 z-50 w-64 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 pt-16">
        <nav>
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                <HomeIcon className="w-5 h-5" />
                <span>მთავარი</span>
              </Link>
            </li>
            <li>
              <Link
                href="/leaderboard"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                <LeaderboardIcon className="w-5 h-5" />
                <span>ლიდერბორდი</span>
              </Link>
            </li>
            <li>
              <Link
                href="/new-users"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                <UsersIcon className="w-5 h-5" />
                <span>მომხმარებლები</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
