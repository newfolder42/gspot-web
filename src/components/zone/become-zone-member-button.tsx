"use client"

import React, { useState } from 'react';
import { zoneMemberLeave, zoneMemberRequest, getZoneMember } from '@/actions/zones';
import type { ZoneJoinPolicy, ZoneMemberRole, ZoneMemberStatus } from '@/actions/zones';

type Props = {
  zoneId: number;
  userId: number;
  joinPolicy: ZoneJoinPolicy;
  role?: ZoneMemberRole | null;
  initialStatus?: ZoneMemberStatus | null;
  onStatusChange?: (newStatus: ZoneMemberStatus | null) => void;
};

const LoadingSvg = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="15.7 47.1" />
  </svg>
);

export default function BecomeZoneMemberButton({ zoneId, userId, joinPolicy, role = null, initialStatus = null, onStatusChange }: Props) {
  const [status, setStatus] = useState<ZoneMemberStatus | null>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMember = status === 'active';
  const isPending = status === 'pending';
  const isJoined = isMember || isPending;
  const canSelfJoin = joinPolicy !== 'invite_only';

  if (status === 'banned') return null;
  if (role === 'owner') return null;
  if (!isJoined && !canSelfJoin) return null;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = isJoined
      ? await zoneMemberLeave(zoneId, userId)
      : await zoneMemberRequest(zoneId, userId);

    if (!result.success) {
      setError('ფიქსირდება ხარვეზი, გთხოვ ცადე მოგვაინებით:' + result.error);
    }

    const member = await getZoneMember(zoneId, userId);
    setStatus(member?.status ?? null);
    onStatusChange?.(member?.status ?? null);

    setLoading(false);
  }

  const label = isMember
    ? 'წევრი'
    : isPending
      ? 'მოლოდინში'
      : joinPolicy === 'request'
        ? 'გაწევრიანების მოთხოვნა'
        : 'გაწევრიანება';

  return (
    <div className="">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 cursor-pointer text-sm font-medium transition ${loading
          ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
          : isJoined
            ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
            : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
      >
        {loading && <LoadingSvg />}
        {!loading && <span>{label}</span>}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
