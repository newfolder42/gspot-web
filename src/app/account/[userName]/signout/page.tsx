"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type PageProps = {
  params: Promise<{ userName?: string }>;
};

export default function SignoutPage({ params }: PageProps){
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut(){
    setLoading(true);
    try{
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    }catch(e){
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sign out</h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Click the button below to sign out of your account.</p>
      <div className="mt-4">
        <button onClick={handleSignOut} disabled={loading} className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
