"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  user: {
    id?: number;
    alias?: string;
  };
};

export default function AccountMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    window.location.href = '/';
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 rounded-md px-3 py-1 text-sm bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <span className="inline-block h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm leading-8 text-center text-zinc-700 dark:text-zinc-100">{(user?.alias || 'U').charAt(0).toUpperCase()}</span>
        <span className="hidden sm:inline text-sm text-zinc-700 dark:text-zinc-200">{user.alias}</span>
        <svg className="h-4 w-4 text-zinc-600 dark:text-zinc-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.656a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-zinc-900 shadow-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
          <div className="py-1">
            <Link href={`/account/${user.alias}`} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800">Manage account</Link>
            <Link href="/photos" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800">My photos</Link>
            <button onClick={() => { setOpen(false); handleSignOut(); }} className="w-full text-left block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800">Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
