"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { PostCommentType } from '@/types/post-comment';
import { formatTimePassed } from '@/lib/dates';
import { addCommentAction } from '@/actions/comments';
import { ReplyIcon, MapPinIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/icons';
import { getInitials } from '@/lib/getInitials';

type PostCommentProps = {
  comment: PostCommentType;
  depth?: number;
  currentUser: string;
  postId: number;
  postAuthorAlias: string;
  onCommentAdded: (comment: PostCommentType) => void;
};

const DEPTH_COLORS = [
  'border-teal-500',
  'border-blue-400',
  'border-violet-400',
  'border-rose-400',
  'border-amber-400',
];

const MAX_EXPANDED_DEPTH = 5;

export default function PostComment({
  comment,
  depth = 0,
  currentUser,
  postId,
  postAuthorAlias,
  onCommentAdded,
}: PostCommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < MAX_EXPANDED_DEPTH);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showReplyForm) {
      textareaRef.current?.focus();
    }
  }, [showReplyForm]);

  const handleReply = async () => {
    const trimmed = replyBody.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await addCommentAction(postId, trimmed, comment.id);
      if (newComment) {
        onCommentAdded(newComment);
        setShowReplies(true);
        setReplyBody('');
        setShowReplyForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isDeleted = !!comment.deletedAt;
  const isGuess = comment.type === 'gps-post-guess';
  const isPostAuthor = comment.author === postAuthorAlias;
  const hasChildren = comment.children.length > 0;
  const borderColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];
  const initials = getInitials(comment.author);
  const collapsedPreview = isDeleted
    ? 'კომენტარი წაიშალა'
    : isGuess
      ? [
        comment.metadata?.score != null ? `ქულა ${comment.metadata.score}` : null,
        comment.metadata?.distance != null ? `მანძილი ${comment.metadata.distance.toLocaleString('ka-GE')} მ` : null,
      ].filter(Boolean).join(' • ') || 'გამოცნობა'
      : comment.body.replace(/\s+/g, ' ').trim() || 'კომენტარი';

  return (
    <div className={depth > 0 ? `pl-3 border-l-2 ${borderColor} ${collapsed ? `rounded-b-lg` : ''}` : ''}>
      <div className="py-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="relative flex-shrink-0 w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:opacity-80 select-none"
            aria-label={collapsed ? 'expand comment' : 'collapse comment'}
            title={collapsed ? 'გაშლა' : 'დაკეცვა'}
          >
            {initials}
            <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300">
              {collapsed ? <ChevronDownIcon className="w-2.5 h-2.5" /> : <ChevronUpIcon className="w-2.5 h-2.5" />}
            </span>
          </button>
          <Link
            href={`/account/${comment.author}`}
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline"
          >
            &apos;{comment.author}
          </Link>
          {isPostAuthor && (
            <span className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400">
              ავტორი
            </span>
          )}
          {isGuess && (
            <span
              className="inline-flex items-center text-teal-600 dark:text-teal-400"
              title="გამოცნობა"
              aria-label="გამოცნობა"
            >
              <MapPinIcon className="w-3 h-3" />
            </span>
          )}
          <span className="text-xs text-zinc-400">•</span>
          <span className="text-xs text-zinc-400">{formatTimePassed(comment.createdAt)}</span>
          {collapsed && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[45vw] sm:max-w-[28rem]">
              • {collapsedPreview}
            </span>
          )}
        </div>

        {/* Body */}
        {!collapsed && (
          <div>
            {isDeleted ? (
              <p className="text-xs italic text-zinc-400 mb-1">კომენტარი წაიშალა</p>
            ) : isGuess ? (
              <div className="text-sm text-zinc-700 dark:text-zinc-300 mb-1 bg-zinc-50 dark:bg-zinc-800/50 rounded px-2 py-1.5 inline-block">
                {comment.metadata?.score != null && (
                  <span className="mr-3">
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs">ქულა </span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">{comment.metadata.score}</span>
                  </span>
                )}
                {comment.metadata?.distance != null && (
                  <span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs">მანძილი </span>
                    <span className="font-semibold">{comment.metadata.distance.toLocaleString("ka-GE")} მ</span>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-800 dark:text-zinc-200 mb-1 whitespace-pre-wrap break-words">
                {comment.body}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-1">
              {currentUser && !isDeleted && (
                <button
                  type="button"
                  onClick={() => setShowReplyForm((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  <ReplyIcon className="w-3 h-3" />
                  პასუხი
                </button>
              )}
              {hasChildren && !showReplies && (
                <button
                  type="button"
                  onClick={() => setShowReplies(true)}
                  className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {comment.children.length} პასუხის ნახვა
                </button>
              )}

            </div>

            {/* Reply form */}
            {showReplyForm && (
              <div className="mt-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-shadow focus-within:ring-1 focus-within:ring-teal-500">
                <textarea
                  ref={textareaRef}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="პასუხი..."
                  maxLength={2000}
                  className="w-full rounded-2xl bg-transparent px-3 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => { setShowReplyForm(false); setReplyBody(''); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    გაუქმება
                  </button>
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={submitting || !replyBody.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'იგზავნება...' : 'გაგზავნა'}
                  </button>
                </div>
              </div>
            )}

            {/* Children */}
            {hasChildren && (
              <div className="mt-2 space-y-0">
                {showReplies && (
                  <>
                    {comment.children.map((child) => (
                      <PostComment
                        key={child.id}
                        comment={child}
                        depth={depth + 1}
                        currentUser={currentUser}
                        postId={postId}
                        postAuthorAlias={postAuthorAlias}
                        onCommentAdded={onCommentAdded}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
