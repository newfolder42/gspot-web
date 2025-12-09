"use client";

import { signOut } from 'next-auth/react';
import { useState } from 'react';

export default function SignoutPage() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut({ callbackUrl: '/' });
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">გამოსვლა</h1>
      <div className="mt-4">
        <button onClick={handleSignOut} disabled={loading} className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
          {loading ? 'მიმდინარეობს...' : 'გამოსვლა'}
        </button>
      </div>
    </div>
  );
}
