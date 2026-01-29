"use client";
import { useState } from "react";
import Link from "next/link";

export default function LeftPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden p-2 rounded-md inline-flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clipRule="evenodd" />
        </svg>
      </button>

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

      {open && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          </div>

          <aside className="fixed left-0 top-0 z-50 w-64 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 rounded-md text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <nav>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="block px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
                    მთავარი
                  </Link>
                </li>
                <li>
                  <Link href="/leaderboard" className="block px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
                    ლიდერბორდი
                  </Link>
                </li>
                <li>
                  <Link href="/new-users" className="block px-3 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
                    მომხმარებლები
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
