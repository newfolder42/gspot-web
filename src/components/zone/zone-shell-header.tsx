"use client";

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@/components/icons';
import AccountTabs from '@/components/account/account-tabs';
import type { AccountTab } from '@/components/account/account-tabs';
import BecomeZoneMemberButton from './become-zone-member-button';
import type { ZoneMemberRole, ZoneMemberStatus, ZoneType } from '@/actions/zones';
import ProfileAvatar from '@/components/common/profileAvatar';

type Props = {
  zone: ZoneType;
  userId: number | null;
  initialStatus: ZoneMemberStatus | null;
  initialRole: ZoneMemberRole | null;
  tabs: AccountTab[];
};

export default function ZoneShellHeader({ zone, userId, initialStatus, initialRole, tabs }: Props) {
  const [memberStatus, setMemberStatus] = useState<ZoneMemberStatus | null>(initialStatus);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const zoneSlug = zone.slug;
  const zoneDescription = zone.description?.trim() ?? '';
  const hasDescription = zoneDescription.length > 0;
  const shouldTruncateDescription = zoneDescription.length > 100;
  const hasBanner = Boolean(zone.banner_url);
  const visibleDescription = expandedDescription || !shouldTruncateDescription
    ? zoneDescription
    : `${zoneDescription.slice(0, 100).trimEnd()}...`;

  return (
    <>
      <div>
        <div className="relative">
          <div className="relative h-28 sm:h-36 overflow-hidden rounded-t-md bg-zinc-200 dark:bg-zinc-800">
            {hasBanner ? (
              <Image
                src={zone.banner_url!}
                alt={`${zoneSlug} banner`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          </div>

          <div className="relative px-4 pt-2 pb-4">
            <div className="absolute left-4 -top-8 sm:-top-10 z-20">
              <ProfileAvatar
                name={zoneSlug}
                photoUrl={zone.profile_photo_url ?? null}
                fallbackText={zoneSlug[0]?.toUpperCase() ?? '?'}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-md text-2xl ring-2 ring-white/90 dark:ring-zinc-900/80"
                initialsClassName="text-2xl font-semibold"
                width={80}
                height={80}
              />
            </div>

            <div className="pl-20 sm:pl-24 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">{zoneSlug}</h1>

                <div className="flex items-center gap-2 shrink-0">
                  {userId && memberStatus === 'active' && (
                    <Link
                      href={`/zone/${zone.slug}/submit`}
                      aria-label="Create post"
                      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <PlusIcon />
                      <span className="hidden sm:inline">დამატება</span>
                    </Link>
                  )}

                  {userId && (
                    <BecomeZoneMemberButton
                      zoneId={zone.id}
                      userId={userId}
                      joinPolicy={zone.join_policy}
                      role={initialRole}
                      initialStatus={initialStatus}
                      onStatusChange={setMemberStatus}
                    />
                  )}
                </div>
              </div>

              {hasDescription && (
                <div className="mt-2 max-w-2xl">
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300 break-words">{visibleDescription}</p>
                  {shouldTruncateDescription && (
                    <button
                      type="button"
                      onClick={() => setExpandedDescription((prev) => !prev)}
                      className="mt-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      {expandedDescription ? 'ნაკლები' : 'მეტი'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 flex items-center justify-between">
        <AccountTabs tabs={tabs} />
      </div>
    </>
  );
}
