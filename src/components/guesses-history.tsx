import type React from "react";
import Link from "next/link";
import { formatActionDate } from "@/lib/dates";
import { formatGuessDistance, getGuessScoreColor, GUESS_INDEX_MIN_GUESSES } from "@/lib/guess-index";
import GuessIndexPanel from "./account/guess-index-panel";
import type { PostGuessType } from "@/types/post-guess";
import { ListIcon, TrophyIcon } from "./icons";

type GuessItem = PostGuessType & {
  postTitle: string;
  postAuthor: string;
  postUserId: number;
};

const LIST_SIZE = 5;

function GuessRow({ guess }: { guess: GuessItem }) {
  const scoreColor = typeof guess.score === "number" ? getGuessScoreColor(guess.score) : null;

  return (
    <div className="flex items-start gap-3 border-b border-zinc-200 px-3 py-2.5 last:border-b-0 dark:border-zinc-800">
      {scoreColor ? (
        <span
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-bold"
          style={{ color: scoreColor, borderColor: scoreColor + '70', backgroundColor: scoreColor + '18' }}
        >
          {guess.score}
        </span>
      ) : (
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-sm text-zinc-400 dark:border-zinc-800">
          —
        </span>
      )}

      <div className="min-w-0 flex-1">
        <Link href={`/post/${guess.postId}`} className="hover:underline">
          <h4 className="line-clamp-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {guess.postAuthor + "-ის პოსტი" + (guess.postTitle ? ": " + guess.postTitle : "")}
          </h4>
        </Link>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
          {typeof guess.distance === "number" && (
            <span>მანძილი: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{formatGuessDistance(guess.distance)}</strong></span>
          )}
          <time className="text-zinc-400 dark:text-zinc-500">{formatActionDate(guess.createdAt)}</time>
        </div>
      </div>
    </div>
  );
}

function GuessList({ title, icon, guesses }: { title: string; icon: React.ReactNode; guesses: GuessItem[] }) {
  return (
    <section className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center gap-1.5 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        {icon}
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      </header>
      {guesses.map((guess) => (
        <GuessRow key={guess.id} guess={guess} />
      ))}
    </section>
  );
}

export default function GuessesHistory({ guesses, emptyMessage }: { guesses: GuessItem[]; emptyMessage?: string }) {
  if (guesses.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">{emptyMessage ?? "უსაქმურობის სუნი დგას..."}</p>
      </div>
    );
  }

  const latest = [...guesses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, LIST_SIZE);

  // with only a handful of guesses the index says nothing and the top list just
  // mirrors the latest one, so both stay hidden until there is some history
  const showIndex = guesses.length > GUESS_INDEX_MIN_GUESSES;

  const top = [...guesses]
    .sort((a, b) => {
      const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    })
    .slice(0, LIST_SIZE);

  return (
    <div className="space-y-3">
      {showIndex && <GuessIndexPanel guesses={guesses} />}

      <div className={`grid gap-3 ${showIndex ? "md:grid-cols-2" : ""}`}>
        {showIndex && (
          <GuessList
            title="საუკეთესო გამოცნობები"
            icon={<TrophyIcon className="h-4 w-4 text-amber-500" />}
            guesses={top}
          />
        )}
        <GuessList
          title="ბოლო გამოცნობები"
          icon={<ListIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />}
          guesses={latest}
        />
      </div>
    </div>
  );
}
