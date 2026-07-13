import Link from "next/link";
import { MapPinIcon, MessageIcon, UpvoteIcon } from "../icons";

export default function PostStatsBadge({
  href,
  commentCount,
  guessCount,
  voteScore,
  className = "absolute top-3 right-3",
  title,
}: {
  href: string;
  commentCount: number;
  guessCount?: number | null;
  voteScore?: number | null;
  className?: string;
  title?: string;
}) {
  return (
    <Link
      href={href}
      className={`${className} inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 text-zinc-50 backdrop-blur-sm px-2.5 py-1 border border-zinc-100/20 hover:bg-zinc-900/90 transition`}
      title={title}
      aria-label={title}
    >
      {voteScore != null && (
        <span className="text-sm font-semibold text-zinc-50 flex items-center gap-1">
          <UpvoteIcon className="w-4 h-4" />
          {voteScore}
        </span>
      )}
      {guessCount != null && (
        <span className={`text-sm font-semibold text-zinc-50 flex items-center gap-1 ${voteScore != null ? 'ml-2' : ''}`}>
          <MapPinIcon className="w-4 h-4" />
          {guessCount}
        </span>
      )}
      <span className={`text-sm font-semibold text-zinc-50 flex items-center gap-1 ${guessCount != null || voteScore != null ? 'ml-2' : ''}`}>
        <MessageIcon className="w-4 h-4" />
        {commentCount}
      </span>
    </Link>
  );
}
