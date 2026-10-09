'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { XIcon } from '@/components/icons';

type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

const BULLET = /^[-•]\s+/;
/** `**bold**` or `[label](target)`, the only inline markup the help texts use. */
const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
/** `https:`, `mailto:`, ...; anything else is a page of the site. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Blank line = new paragraph; a run of "- " lines = one list. */
function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const raw of source.trim().split('\n')) {
    const line = raw.trim();
    if (!line) {
      current = null;
    } else if (BULLET.test(line)) {
      const item = line.replace(BULLET, '');
      if (current?.type === 'ul') {
        current.items.push(item);
      } else {
        current = { type: 'ul', items: [item] };
        blocks.push(current);
      }
    } else if (current?.type === 'p') {
      current.text += `\n${line}`;
    } else {
      current = { type: 'p', text: line };
      blocks.push(current);
    }
  }
  return blocks;
}

const LINK_CLASS = 'text-teal-600 dark:text-teal-400 hover:underline';

function InlineText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const parts: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    if (match[1] !== undefined) {
      parts.push(
        <strong key={start} className="font-semibold text-zinc-900 dark:text-zinc-50">
          {match[1]}
        </strong>
      );
    } else {
      const target = match[3];
      parts.push(
        HAS_SCHEME.test(target) ? (
          <a key={start} href={target} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {match[2]}
          </a>
        ) : (
          // The dialog sits on top of the page, so leave it when following a link.
          <Link key={start} href={target} onClick={onNavigate} className={LINK_CLASS}>
            {match[2]}
          </Link>
        )
      );
    }
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <>{parts}</>;
}

type Props = {
  title: string;
  /** Markdown subset, see `lib/infoTopics`. */
  description: string;
  onClose: () => void;
};

/** The one help dialog: titled header with a close button over the rendered description. */
export default function InfoDialog({ title, description, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Portalled to <body> so it also works from inside another dialog or a clipped container.
  return createPortal(
    <div
      className="fixed inset-0 z-layer-modal flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm max-h-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            aria-label="დახურვა"
            title="დახურვა"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-5 overflow-y-auto text-sm leading-5 text-zinc-600 dark:text-zinc-400">
          {parseBlocks(description).map((block, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-3' : ''}>
              {block.type === 'p' ? (
                <p className="whitespace-pre-line">
                  <InlineText text={block.text} onNavigate={onClose} />
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {block.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-zinc-400 dark:text-zinc-500">•</span>
                      <span className="flex-1">
                        <InlineText text={item} onNavigate={onClose} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
