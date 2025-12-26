"use client"

import { DifficultyLevel, GpsPostRatingType } from "@/types/post";
import { useState } from "react";

type DifficultyRatingProps = {
  postId: number;
  userRating: DifficultyLevel | null;
  ratings?: GpsPostRatingType | null;
  onRate: (level: DifficultyLevel) => Promise<void>;
};

const EasyIcon = () => (
  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9 9h.01M15 9h.01" />
    <path d="M9 15a3 3 0 0 1 6 0" />
  </svg>
);

const GoodIcon = () => (
  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <path d="M9 9h.01M15 9h.01" />
  </svg>
);

const HardIcon = () => (
  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7v5M12 17h.01" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
  </svg>
);

const DownvoteIcon = () => (
  <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4v14M12 18l-6-6M12 18l6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LoadingIcon = () => (
  <svg className="w-5 h-5 inline-block animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="15.7 47.1" />
  </svg>
);

const difficulties = [
  {
    level: DifficultyLevel.DOWNVOTE,
    label: "DOWNVOTE",
    description: "უსარგებლო",
    icon: DownvoteIcon,
    color: "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30",
  },
  {
    level: DifficultyLevel.EASY,
    label: "EASY",
    description: "ადვილი",
    icon: EasyIcon,
    color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
  },
  {
    level: DifficultyLevel.GOOD,
    label: "GOOD",
    description: "საკაიფო",
    icon: GoodIcon,
    color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
  },
  {
    level: DifficultyLevel.HARD,
    label: "HARD",
    description: "რთული",
    icon: HardIcon,
    color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
  }
];

export default function DifficultyRating({
  postId,
  userRating,
  ratings,
  onRate,
}: DifficultyRatingProps) {
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel | null>(userRating);

  const handleRate = async (level: DifficultyLevel, isCurrentlySelected: boolean) => {
    setLoading(true);
    const startTime = Date.now();
    try {
      if (isCurrentlySelected) {
        await onRate(null as any);
        setSelectedLevel(null);
      } else {
        await onRate(level);
        setSelectedLevel(level);
      }
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) {
        await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
      }
    } catch (err) {
      console.error("Failed to rate post:", err);
      setSelectedLevel(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 bg-white dark:bg-zinc-900">
      <div className="flex gap-1 flex-wrap">
        {difficulties.map((difficulty) => {
          const count = ratings?.[difficulty.label.toUpperCase() as keyof typeof ratings] || 0;
          const percentage =
            ratings && ratings.total > 0
              ? Math.round((count / ratings.total) * 100)
              : 0;
          const isSelected = selectedLevel === difficulty.level;
          const IconComponent = difficulty.icon;

          return (
            <div key={difficulty.level} className="relative group">
              <button
                onClick={() => handleRate(difficulty.level, isSelected)}
                disabled={loading}
                className={`
                  px-2 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1
                  ${difficulty.color}
                  ${isSelected ? "px-4 brightness-90 shadow-md" : ""}
                  ${isSelected && loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {loading && isSelected ? <LoadingIcon /> : <IconComponent />}
                {count > 0 && <span className={`text-xs`}>{count}</span>}
              </button>

              {/* Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-zinc-900 dark:bg-zinc-700 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                  {difficulty.description}
                  {percentage > 0 && ` • ${percentage}%`}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
