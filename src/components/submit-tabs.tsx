"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Submit from '@/components/submit';
import CreateHideAndSeek from '@/components/hide-and-seek/create-hide-and-seek';
import type { ZoneSubmitType } from '@/actions/zones';
import type { ActiveHideAndSeekType } from '@/types/hide-and-seek';
import { CameraIcon, EyeIcon } from '@/components/icons';

export type SubmitTab = 'photo' | 'hide-and-seek';

const TABS: { key: SubmitTab; label: string; Icon: typeof CameraIcon }[] = [
  { key: 'photo', label: 'ფოტო', Icon: CameraIcon },
  { key: 'hide-and-seek', label: 'დამალობანა', Icon: EyeIcon },
];

type Props = {
  zones: ZoneSubmitType[];
  initialTab: SubmitTab;
  /** The game the user is already in, if any. Blocks starting a second one. */
  activeGame: ActiveHideAndSeekType | null;
};

/**
 * One entry point for everything a user can post. The tab lives in the URL so
 * /submit?tab=hide-and-seek is linkable and the back button behaves.
 */
export default function SubmitTabs({ zones, initialTab, activeGame }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<SubmitTab>(initialTab);

  const selectTab = (next: SubmitTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'photo') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    // replace, not push: switching tabs should not stack history entries
    router.replace(qs ? `/submit?${qs}` : '/submit', { scroll: false });
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="რის გამოქვეყნება"
        className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
      >
        {TABS.map(({ key, label, Icon }) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectTab(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                selected
                  ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {tab === 'photo' ? (
          <Submit zones={zones} initialZoneId={null} initialZoneSlug={null} />
        ) : activeGame ? (
          <div className="max-w-2xl mx-auto py-8 text-center space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">უკვე ერთ დამალობანაში ხარ</h2>
            <p className="text-sm text-zinc-500">ახლის დაწყებამდე მიმდინარე თამაში უნდა დასრულდეს.</p>
            <Link
              href={`/post/${activeGame.postId}`}
              className="inline-block rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              მიმდინარე თამაშზე გადასვლა
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <CreateHideAndSeek zones={zones.map((z) => ({ id: z.id, slug: z.slug, name: z.name }))} />
          </div>
        )}
      </div>
    </div>
  );
}
