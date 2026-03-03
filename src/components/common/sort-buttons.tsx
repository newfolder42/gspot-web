type SortType = "date" | "distance";

interface SortButtonsProps {
  sortType: SortType;
  onSortChange: (sortType: SortType) => void;
}

export default function SortButtons({ sortType, onSortChange }: SortButtonsProps) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">დალაგება:</span>
      <button
        onClick={() => onSortChange("date")}
        className={`p-2 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${sortType === "date"
          ? "bg-blue-500 text-white"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        title="თარიღით"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {sortType === "date" && (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        )}
      </button>
      <button
        onClick={() => onSortChange("distance")}
        className={`p-2 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${sortType === "distance"
          ? "bg-blue-500 text-white"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        title="მანძილით"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M7 12L12 7L17 12"/>
        </svg>
        {sortType === "distance" && (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export type { SortType };
