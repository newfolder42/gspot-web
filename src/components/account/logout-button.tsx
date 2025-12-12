"use client"

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
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
    <div className="mt-4">
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? 'მიმდინარეობს...' : 'გასვლა'}
      </button>
    </div>
  );
}
