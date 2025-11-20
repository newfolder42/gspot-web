"use client";
import Link from 'next/link';
import Image from 'next/image';
import React, { useState } from 'react';
import FollowButton from './follow-button';

type Props = {
  alias: string;
  name?: string | null;
  profilePhoto?: { url?: string | null } | null;
  onUnfollow?: () => void;
  canUnfollow?: boolean;
};

export default function ConnectionCard({ alias, name, profilePhoto, onUnfollow, canUnfollow = false }: Props) {
  const [loading, setLoading] = useState(false);
  const photoUrl = profilePhoto?.url || null;

  async function handleUnfollow(e: React.MouseEvent) {
    e.preventDefault();
    if (!canUnfollow) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/account/${encodeURIComponent(alias)}/connections`, { method: 'DELETE' });
      if (res.ok) {
        onUnfollow && onUnfollow();
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 p-3 border rounded-md bg-white dark:bg-zinc-900">
      <Link href={`/account/${alias}`} className="flex items-center gap-3 flex-1">
        <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {photoUrl ? (
            <Image src={photoUrl} alt={alias} width={48} height={48} className="h-12 w-12 object-cover" />
          ) : (
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{(name || alias).charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="truncate">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{name ?? alias}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">@{alias}</div>
        </div>
      </Link>
      {canUnfollow && (
        <FollowButton alias={alias} initialConnected={Boolean(true)} />
      )}
    </div>
  );
}
