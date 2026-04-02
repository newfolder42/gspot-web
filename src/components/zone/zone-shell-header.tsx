"use client";

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { getInitials } from '@/lib/getInitials';
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
  const zoneSlug = zone.slug;
  const zoneDescription = zone.description?.trim() ?? '';
  const hasDescription = zoneDescription.length > 0;
  const shouldTruncateDescription = zoneDescription.length > 100;
  const hasProfilePhoto = Boolean(zone.profile_photo_url);
  const hasBanner = Boolean(zone.banner_url);
  const initials = getInitials(zoneSlug);
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
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-2xl font-semibold text-zinc-700 dark:text-zinc-200 ring-2 ring-white/90 dark:ring-zinc-900/80">
                {hasProfilePhoto ? (
                  <Image src={zone.profile_photo_url!} alt={`${zoneSlug} profile photo`} fill className="object-cover" sizes="(max-width: 640px) 64px, 80px" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </div>

            <div className="pl-20 sm:pl-24 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 truncate">{zoneSlug}</h1>

                <div className="flex items-center gap-2 shrink-0">
                  {userId && memberStatus === 'active' && (
                    <Link
                      href={`/zone/${zone.slug}/submit`}
                      aria-label="Create post"
                      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <PlusIcon />
                      <span className="hidden sm:inline">დამატება</span>
                    </Link>
                  )}

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

              {hasDescription && (
                <div className="mt-2 max-w-2xl">
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300 break-words">{visibleDescription}</p>
                  {shouldTruncateDescription && (
                    <button
                      type="button"
                      onClick={() => setExpandedDescription((prev) => !prev)}
                      className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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
