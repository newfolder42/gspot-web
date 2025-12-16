import Link from "next/link";
import type { PostGuessType } from "@/types/post-guess";

export default function PostGuess({ guess }: { guess: PostGuessType }) {
  return (
    <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/account/${guess.author}`} className="text-sm font-medium hover:underline text-zinc-900 dark:text-zinc-50">
          {guess.author}
        </Link>
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
