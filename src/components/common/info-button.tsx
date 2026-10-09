'use client';

import { useState } from 'react';
import { HelpCircleIcon } from '@/components/icons';
import InfoDialog from '@/components/common/info-dialog';
import { getInfoTopic, type InfoTopicKey } from '@/lib/infoTopics';

type Props = {
  topic: InfoTopicKey;
  className?: string;
  iconClassName?: string;
};

/**
 * A (?) icon that opens the help text registered under `topic` in `lib/infoTopics`.
 * Opens on click (no hover), keeps its own open state, and so works the same in a page
 * header, inline in a row, or inside another dialog.
 */
export default function InfoButton({ topic, className = '', iconClassName = 'w-4 h-4' }: Props) {
  const [open, setOpen] = useState(false);
  const info = getInfoTopic(topic);

  if (!info) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${info.title}: დეტალები`}
        title={info.title}
        className={`inline-flex shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer ${className}`}
      >
        <HelpCircleIcon className={iconClassName} />
      </button>
      {open ? <InfoDialog title={info.title} description={info.description} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
