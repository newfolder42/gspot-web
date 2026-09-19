'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import NewGuess from '@/components/new-guess';
import ProfileAvatar from '@/components/common/profileAvatar';
import LevelBadge from '@/components/common/level-badge';
import { MapPinIcon, XIcon } from '@/components/icons';
import { useShuffleDeck } from './use-shuffle-deck';

/** A swipe shorter than this is a scroll wobble, not "next". */
const SWIPE_THRESHOLD_PX = 60;

/**
 * The deck owns everything below the header. Fixed rather than tall, so the
 * page can't scroll the footer into view halfway through a card. Being fixed
 * it is also its own stacking context, so a modal has to be rendered beside
 * it, not inside it, to sit above the site header.
 */
function ShuffleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 md:left-56 flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {children}
    </div>
  );
}

export default function ShuffleClient() {
  const router = useRouter();
  const { current, played, loading, finished, advance } = useShuffleDeck();

  const [guessOpen, setGuessOpen] = useState(false);
  /** Set by the modal on a successful guess, so closing it moves on. */
  const guessed = useRef(false);
  const touchStartY = useRef<number | null>(null);

  // Nothing behind the deck should scroll while it is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Desktop has no swipe, so the same moves are on the keyboard.
  useEffect(() => {
    if (guessOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        advance(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setGuessOpen(true);
      } else if (e.key === 'Escape') {
        router.push('/to-guess');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, guessOpen, router]);

  if (loading) {
    return (
      <ShuffleShell>
        <div className="flex flex-1 items-center justify-center text-zinc-500">იტვირთება...</div>
      </ShuffleShell>
    );
  }

  if (finished || !current) {
    return (
      <ShuffleShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-zinc-600 dark:text-zinc-300">ახალი გამოსაცნობი ჯერჯერობით არ არის</p>
          <Link
            href="/to-guess"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            გამოსაცნობებში დაბრუნება
          </Link>
        </div>
      </ShuffleShell>
    );
  }

  return (
    <>
      <ShuffleShell>
        <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col md:p-2">
          <div
            key={current.id}
            className="shuffle-card-in relative min-h-0 flex-1 overflow-hidden bg-black md:rounded-lg"
            onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
              const start = touchStartY.current;
              touchStartY.current = null;
              if (start !== null && e.changedTouches[0].clientY - start < -SWIPE_THRESHOLD_PX) {
                advance(true);
              }
            }}
          >
            <Image
              src={current.imageVariants?.feed ?? current.image}
              alt={current.title || `'${current.author}-მომხმარებლის სურათი`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />

            {/* Who and where, over the top of the photo */}
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/45 px-3 py-3">
              <div className="pointer-events-auto flex items-center gap-1.5">
                <Link
                  href={`/zone/${current.zoneSlug}`}
                  className="flex items-center gap-1 text-sm font-semibold text-zinc-100 hover:underline"
                >
                  <ProfileAvatar
                    name={current.zoneSlug}
                    photoUrl={current.zoneProfilePhoto}
                    className="w-6 h-6 rounded-md flex-shrink-0"
                    initialsClassName="text-[8px] font-bold"
                    width={24}
                    height={24}
                  />
                  {current.zoneSlug}
                </Link>
                <span className="text-xs text-zinc-400">•</span>
                {/* Not UserLink: its colours are tuned for a page background, not a photo. */}
                <Link
                  href={`/account/${current.author}`}
                  className="flex items-center gap-1 text-sm font-semibold text-zinc-100 hover:underline"
                >
                  &apos;{current.author}
                  {current.authorLevel != null && <LevelBadge level={current.authorLevel} />}
                </Link>
                <span className="ml-auto text-xs text-zinc-300">{played + 1}</span>
              </div>
              {current.title && (
                <div className="mt-1 text-sm text-zinc-200">{current.title}</div>
              )}
            </div>

            {/* Skip / guess. Also reachable by swipe up and by keyboard. */}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/45 px-3 py-3">
              <button
                onClick={() => advance(true)}
                className="flex items-center gap-1.5 rounded-md bg-white/15 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/25"
              >
                <XIcon className="w-4 h-4" />
                გამოტოვება
              </button>
              <button
                onClick={() => setGuessOpen(true)}
                className="ml-auto flex items-center gap-1.5 rounded-md bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500"
              >
                <MapPinIcon className="w-4 h-4" />
                გამოცნობა
              </button>
            </div>
          </div>

          <p className="hidden md:block py-2 text-center text-xs text-zinc-500">
            Enter გამოსაცნობად, Space გამოსატოვებლად
          </p>
        </div>
      </ShuffleShell>

      {guessOpen && (
        <NewGuess
          postId={current.id}
          postImage={current.image}
          postTitle={current.title}
          layout="split"
          closeLabel="შემდეგი"
          onSubmitted={() => { guessed.current = true; }}
          onClose={() => {
            setGuessOpen(false);
            if (guessed.current) {
              guessed.current = false;
              advance(false);
            }
          }}
        />
      )}
    </>
  );
}
