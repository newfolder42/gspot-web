"use client";

import { useEffect, useState } from 'react';
import { loadRewardUsersAction } from '@/actions/rewards';
import type { RewardUserType } from '@/types/reward';
import RewardIcon from './reward-icons';
import UserLink from '@/components/common/user-link';
import TimePassed from '@/components/common/time-passed';
import { XIcon } from '@/components/icons';

type RewardDetailsModalProps = {
  postId: number;
  commentId: number | null;
  onClose: () => void;
};

export default function RewardDetailsModal({ postId, commentId, onClose }: RewardDetailsModalProps) {
  const [users, setUsers] = useState<RewardUserType[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRewardUsersAction(postId, commentId).then((list) => {
      if (!cancelled) setUsers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [postId, commentId]);

  // preserves the natural order of `users` (most recently given first), so no separate
  // definitions fetch is needed just to decide group order
  const keys = Array.from(new Set((users ?? []).map((u) => u.key)));

  return (
    <div
      className="fixed inset-0 z-layer-modal flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[70vh] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">ჯილდოს გამცემები</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            aria-label="დახურვა"
            title="დახურვა"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {users === null ? (
            <div className="py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">იტვირთება...</div>
          ) : users.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">ჯილდოები არ არის</div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => {
                const group = users.filter((u) => u.key === key);
                const { name, iconUrl } = group[0];
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <RewardIcon iconUrl={iconUrl} name={name} className="w-5 h-5" />
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {name}
                      </span>
                      <span className="text-xs text-zinc-400">{group.length}</span>
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {group.map((u) => (
                        <li key={`${key}-${u.userId}`} className="flex items-center gap-2">
                          <UserLink alias={u.alias} level={u.level} className="text-sm" />
                          <span className="text-xs text-zinc-400">•</span>
                          <TimePassed date={u.createdAt} className="text-xs text-zinc-400" />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
