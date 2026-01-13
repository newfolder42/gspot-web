"use client";

import { NotificationConnectionPublishedGpsPostDetailsType, NotificationType } from "@/actions/notifications";
import { useRouter } from "next/navigation";

type NotificationItemProps = {
  notification: NotificationType;
  onClick?: (notificationId: string) => void;
};

const MAX_DETAIL_LENGTH = 80;

const formatConnectionPostMessage = (details: string): string => {
  try {
    const parsed = JSON.parse(details);
    const { authorAlias, title } = parsed;

    return `${authorAlias}-მა დაპოსტა: ${title}`;
  } catch {
    return details;
  }
};

export default function NotificationItemConnectionPost({
  notification,
  onClick,
}: NotificationItemProps) {
  const router = useRouter();
  const details = notification.details as NotificationConnectionPublishedGpsPostDetailsType;
  const formattedMessage = `${details.userAlias}-მა დაპოსტა: ${details.title}`;
  const truncatedDetails =
    formattedMessage.length > MAX_DETAIL_LENGTH
      ? formattedMessage.slice(0, MAX_DETAIL_LENGTH) + "..."
      : formattedMessage;

  const handleClick = () => {
    router.push(`/post/${details.postId}`);
    onClick?.(details.postId.toString());
  };

  return (
    <div
      onClick={handleClick}
      className="group p-2 px-6 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-950 dark:group-hover:text-white">
        {details.userAlias}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 mt-1 line-clamp-2">
        {truncatedDetails}
      </p>
      {notification.timestamp && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 mt-1">
          {notification.timestamp}
        </p>
      )}
    </div>
  );
}
