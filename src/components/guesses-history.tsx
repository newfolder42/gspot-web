"use client";

import { useState } from "react";
import Link from "next/link";
import { formatActionDate } from "@/lib/dates";
import SortButtons, { type SortType } from "./common/sort-buttons";
import type { PostGuessType } from "@/types/post-guess";

type GuessItem = PostGuessType & {
  postTitle: string;
  postAuthor: string;
  postUserId: number;
};

export default function GuessesHistory({ guesses, emptyMessage }: { guesses: GuessItem[]; emptyMessage?: string }) {
  const [sortType, setSortType] = useState<SortType>("date");

  const sortedGuesses = [...guesses]
    .sort((a, b) => {
      if (sortType === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        const distanceA = a.distance ?? Infinity;
        const distanceB = b.distance ?? Infinity;
        return distanceA - distanceB;
      }
    })
    .slice(0, 15);

  if (guesses.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-md p-6 border border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">{emptyMessage ?? "უსაქმურობის სუნი დგას..."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <SortButtons sortType={sortType} onSortChange={setSortType} />
      </div>
      <div className="p-4 grid gap-2">
        {sortedGuesses.map((guess) => (
          <div
            key={guess.id}
            className="p-4 bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <Link href={`/post/${guess.postId}`} className="hover:underline flex-1">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2">
                      {guess.postAuthor + "-ის პოსტი" + (guess.postTitle ? ": " + guess.postTitle : "")}
                    </h3>
                  </Link>
                  <time className="text-xs text-zinc-400 shrink-0">
                    {formatActionDate(guess.createdAt)}
                  </time>
                </div>
                <div className="flex items-baseline gap-2 mt-2 text-sm">
                  {typeof guess.distance === "number" && (
                    <span className="text-zinc-700 dark:text-zinc-300">
                      მანძილი: <strong className="text-zinc-900 dark:text-zinc-50">{guess.distance.toLocaleString("ka-GE")} მ</strong>
                    </span>
                  )}
                  {typeof guess.score === "number" && (
                    <span className="text-zinc-700 dark:text-zinc-300">
                      ქულა: <strong className="text-zinc-900 dark:text-zinc-50">{guess.score}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
