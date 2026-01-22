import Link from "next/link";
import type { PostGuessType } from "@/types/post-guess";
import { formatActionDate } from "@/lib/dates";

export default function PostGuess({ guess }: { guess: PostGuessType }) {
  return (
    <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-baseline gap-2">
        <Link href={`/account/${guess.author}`} className="text-sm font-medium hover:underline text-zinc-900 dark:text-zinc-50">
          {guess.author}
        </Link>
        <time className="text-xs text-zinc-400">{formatActionDate(guess.createdAt)}</time>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <span>ქულა: <strong className="text-zinc-900 dark:text-zinc-50">{guess.score}</strong></span>
        {typeof guess.distance === 'number' && (
          <span>მანძილი: <strong className="text-zinc-900 dark:text-zinc-50">{guess.distance} მ</strong></span>
        )}
      </div>
    </div>
  );
}
