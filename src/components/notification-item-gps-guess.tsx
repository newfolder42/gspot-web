"use client";

import { useRouter } from "next/navigation";

type NotificationItemProps = {
  id: string;
  user: {
    userId: number;
    alias: string;
  };
  details: string;
  timestamp?: string;
  onClick?: (notificationId: string) => void;
};

const MAX_DETAIL_LENGTH = 80;

const formatGpsGuessMessage = (details: string): string => {
  try {
    const parsed = JSON.parse(details);
    const { userAlias, score } = parsed;

    if (!userAlias || score === undefined) {
      return details;
    }

    return `შენს პოსტზე სცადეს გამოცნობა (${score} ქულა)`;
  } catch {
    return details;
  }
};

const getPostIdFromDetails = (details: string): string | null => {
  try {
    const parsed = JSON.parse(details);
    return parsed.postId || null;
  } catch {
    return null;
  }
};

export default function NotificationItemGpsGuess({
  id,
  user,
  details,
  timestamp,
  onClick,
}: NotificationItemProps) {
  const router = useRouter();

  const formattedMessage = formatGpsGuessMessage(details);
  const truncatedDetails =
    formattedMessage.length > MAX_DETAIL_LENGTH
      ? formattedMessage.slice(0, MAX_DETAIL_LENGTH) + "..."
      : formattedMessage;

  const handleClick = () => {
    const postId = getPostIdFromDetails(details);
    if (postId) {
      router.push(`/post/${postId}`);
    }
    onClick?.(id);
  };

  return (
    <div
      onClick={handleClick}
      className="group p-2 px-6 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-950 dark:group-hover:text-white">
        {user.alias}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 mt-1 line-clamp-2">
        {truncatedDetails}
      </p>
      {timestamp && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 mt-1">
          {timestamp}
        </p>
      )}
    </div>
  );
}
