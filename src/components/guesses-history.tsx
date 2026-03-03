"use client";

import { useState } from "react";
import Link from "next/link";
import { formatActionDate } from "@/lib/dates";
import type { PostGuessType } from "@/types/post-guess";

type GuessItem = PostGuessType & {
  postTitle: string;
  postAuthor: string;
  postUserId: number;
};

type SortType = "date" | "distance";

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
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 rounded-md p-4 border border-zinc-200 dark:border-zinc-800 flex gap-2">
        <button
          onClick={() => setSortType("date")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${sortType === "date"
            ? "bg-blue-500 text-white"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
        >
          თარიღით
        </button>
        <button
          onClick={() => setSortType("distance")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${sortType === "distance"
            ? "bg-blue-500 text-white"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
        >
          მანძილით
        </button>
      </div>

      <div className="grid gap-2">
        {sortedGuesses.map((guess) => (
          <div
            key={guess.id}
            className="bg-white dark:bg-zinc-900 rounded-md p-4 border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2">
                    {guess.postTitle || guess.author + "-ის პოსტი"}
                  </h3>
                  <Link
                    href={`/post/${guess.postId}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                  >
                    <time className="text-xs text-zinc-400">
                      {formatActionDate(guess.createdAt)}
                    </time>
                  </Link>
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
