"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationType, getNotificationContentMessage, getNotificationRoute } from "@/types/notification";
import TimePassed from "@/components/common/time-passed";
import { markAsRead, markAsUnread } from "@/actions/notifications";
import { MapPinIcon, ImageIcon, AlertTriangleIcon, UsersIcon, InfoIcon, TrophyIcon, MessageIcon, CameraIcon } from "@/components/icons";

export function NotificationIcon({ type, className }: { type: NotificationType['type']; className?: string }) {
  const cls = className ?? "w-4 h-4 shrink-0";
  switch (type) {
    case 'gps-guess': return <MapPinIcon className={cls} />;
    case 'gps-photo-guess': return <CameraIcon className={cls} />;
    case 'connection-created-gps-post': return <ImageIcon className={cls} />;
    case 'gps-post-failed': return <AlertTriangleIcon className={cls} />;
    case 'user-started-following': return <UsersIcon className={cls} />;
    case 'user-achievement-achieved': return <TrophyIcon className={cls} />;
    case 'post-comment-created': return <MessageIcon className={cls} />;
    default: return <InfoIcon className={cls} />;
  }
}

type Props = {
  notification: NotificationType;
  userId: number;
  onUpdate: (id: string, seen: boolean) => void;
  onNavigate?: () => void;
};

export default function NotificationItem({ notification, userId, onUpdate, onNavigate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const route = getNotificationRoute(notification);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  const handleLinkClick = async () => {
    if (!notification.seen) {
      const res = await markAsRead(userId, notification.id);
      if (res.ok) onUpdate(notification.id, true);
    }
    onNavigate?.();
  };

  const handleToggleSeen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.seen) {
      const res = await markAsUnread(userId, notification.id);
      if (res.ok) onUpdate(notification.id, false);
    } else {
      const res = await markAsRead(userId, notification.id);
      if (res.ok) onUpdate(notification.id, true);
    }
    setMenuOpen(false);
  };

  return (
    <div className="relative group p-2 pl-6 pr-12 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer">
      {!notification.seen && (
        <span className="absolute left-2 top-4 h-1 w-1 rounded-full bg-teal-600" />
      )}

      <Link
        href={route ?? '#'}
        onClick={handleLinkClick}
        className="flex items-start gap-3 min-w-0"
      >
        <div className="mt-0.5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
          <NotificationIcon type={notification.type} />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 line-clamp-2 break-words">
            {getNotificationContentMessage(notification.type, notification.details)}
          </p>
          {notification.timestamp && (
            <TimePassed date={notification.timestamp} className="text-xs text-zinc-500" />
          )}
        </div>
      </Link>

      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
        aria-label="notification menu"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12a2 2 0 11-4 0 2 2 0 014 0zM12 12a2 2 0 11-4 0 2 2 0 014 0zM16 14a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-2 top-8 z-10 w-48 rounded-md bg-white dark:bg-zinc-900 shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800">
          <div className="py-1">
            <button
              onClick={handleToggleSeen}
              className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {notification.seen ? "მონიშნე წაუკითხავად" : "მონიშნე წაკითხულად"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
