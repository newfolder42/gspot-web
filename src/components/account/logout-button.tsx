"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e) {
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
        {loading ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
