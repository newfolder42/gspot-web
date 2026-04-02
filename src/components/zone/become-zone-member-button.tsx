"use client"

import React, { useState } from 'react';
import { zoneMemberLeave, zoneMemberRequest, ZoneMemberStatus, getZoneMember } from '@/actions/zones';

type Props = {
  zoneId: number;
  userId: number;
  initialStatus?: ZoneMemberStatus | null;
  onStatusChange?: (newStatus: ZoneMemberStatus | null) => void;
};

const LoadingSvg = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="15.7 47.1" />
  </svg>
);

export default function BecomeZoneMemberButton({ zoneId, userId, initialStatus = null, onStatusChange }: Props) {
  const [status, setStatus] = useState<ZoneMemberStatus | null>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    console.log('status', status);

    if ((status == 'active' || status == 'pending')) {
      const result = await zoneMemberLeave(zoneId, userId);
      if (!result.success) {
        setError('ფიქსირდება ხარვეზი, გთხოვ ცადე მოგვაინებით:' + result.error);
      }
    }
    else {
      const result = await zoneMemberRequest(zoneId, userId);
      if (!result.success) {
        setError('ფიქსირდება ხარვეზი, გთხოვ ცადე მოგვაინებით:' + result.error);
      }
    }

    var member = await getZoneMember(zoneId, userId);
    setStatus(member?.status ?? null);
    onStatusChange?.(member?.status ?? null);

    setLoading(false);
  }

  return (
    <div className="">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 cursor-pointer text-sm font-medium transition ${loading
          ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
          : (status == 'active' || status == 'pending')
            ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
      >
        {loading && <LoadingSvg />}
        {!loading && (status == 'active' || status == 'pending') && <span>წევრი</span>}
        {!loading && (status == 'left' || status == null) && <span>გაწევრიანება</span>}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
