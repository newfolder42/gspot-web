"use client";

import { useState } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@/components/icons';
import AccountTabs from '@/components/account/account-tabs';
import type { AccountTab } from '@/components/account/account-tabs';
import BecomeZoneMemberButton from './become-zone-member-button';
import type { ZoneMemberStatus, ZoneType } from '@/actions/zones';

type Props = {
  zone: ZoneType;
  userId: number | null;
  initialStatus: ZoneMemberStatus | null;
  isPublic: boolean;
  tabs: AccountTab[];
};

export default function ZoneShellHeader({ zone, userId, initialStatus, isPublic, tabs }: Props) {
  const [memberStatus, setMemberStatus] = useState<ZoneMemberStatus | null>(initialStatus);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const zoneDescription = zone.description?.trim() ?? '';
  const hasDescription = zoneDescription.length > 0;
  const shouldTruncateDescription = zoneDescription.length > 100;
  const visibleDescription = expandedDescription || !shouldTruncateDescription
    ? zoneDescription
    : `${zoneDescription.slice(0, 100).trimEnd()}...`;

  return (
    <>
      <div className="p-4">
        <div className="flex flex-row gap-4 items-center">
          <div className="relative flex items-center">
            <div className="relative h-20 w-20 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-2xl font-semibold text-zinc-700 dark:text-zinc-200">
              <span>სრთ</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">{zone.slug}</h1>
            {hasDescription && (
              <div className="mt-2 max-w-2xl">
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300 break-words">{visibleDescription}</p>
                {shouldTruncateDescription && (
                  <button
                    type="button"
                    onClick={() => setExpandedDescription((prev) => !prev)}
                    className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {expandedDescription ? 'See less' : 'See more'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-center">
            {isPublic && userId && (
              <BecomeZoneMemberButton
                zoneId={zone.id}
                userId={userId}
                initialStatus={initialStatus}
                onStatusChange={setMemberStatus}
              />
            )}
          </div>
        </div>
      </div>

      <div className="px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <AccountTabs tabs={tabs} />
        {userId && memberStatus === 'active' && (
          <Link
            href={`/zone/${zone.slug}/submit`}
            aria-label="Create post"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">დამატება</span>
          </Link>
        )}
      </div>
    </>
  );
}
