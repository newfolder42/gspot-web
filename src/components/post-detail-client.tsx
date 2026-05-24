"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import PostActions from './post-actions';
import PostComments from './post-comments';
import { MapPinIcon, MessageIcon } from './icons';
import ProfileAvatar from './common/profileAvatar';
import TagBadge from './common/tag-badge';
import type { GpsPostType } from '@/types/post';
import { formatActionDate, formatPhotoTakenDate } from '@/lib/dates';
import type { PostGuessType } from '@/types/post-guess';
import type { PostCommentType } from '@/types/post-comment';
import type { ZoneTag } from '@/types/tag';

type PostDetailClientProps = {
  post: GpsPostType;
  comments: PostCommentType[];
  currentUser: string;
  alreadyGuessed: boolean;
  zoneTags: ZoneTag[];
};

export default function PostDetailClient({ post, comments, currentUser, alreadyGuessed, zoneTags }: PostDetailClientProps) {
  const isAuthor = currentUser === post.author;
  const userCanGuess = !!currentUser && !isAuthor && !alreadyGuessed;

  const [isPortrait, setIsPortrait] = useState(false);
  const [canGuess, setCanGuess] = useState(userCanGuess);
  const [guessCount, setGuessCount] = useState(Number(post.guessCount) || 0);

  const handleGuessSubmitted = (_: PostGuessType) => {
    setCanGuess(false);
    setGuessCount(prev => prev + 1);
  };

  const countComments = (items: PostCommentType[]): number =>
    items.reduce((acc, c) => acc + (c.type === 'comment' ? 1 : 0) + countComments(c.children), 0);

  const [commentCount, setCommentCount] = useState(() => countComments(comments));

  // Handler to update comment count after new comment
  const handleCommentAdded = (newComment: PostCommentType) => {
    if (newComment.type === 'comment') setCommentCount(prev => prev + 1 + countComments(newComment.children));
  };

  return (
    <main className="max-w-4xl mx-auto my-auto px-2 py-2 md:py-4">
      <article className="">
        <div className="flex items-start p-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Link href={`/zone/${post.zoneSlug}`} className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:underline">
                <ProfileAvatar
                  name={post.zoneSlug ?? ''}
                  photoUrl={post.zoneProfilePhoto}
                  className="w-6 h-6 rounded-md flex-shrink-0"
                  initialsClassName="text-[8px] font-bold"
                  width={24}
                  height={24}
                />
                {post.zoneSlug}
              </Link>
              <span className="text-xs text-zinc-400">•</span>
              <Link href={`/account/${post.author}`} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:underline">&apos;{post.author}</Link>
              <span className="text-xs text-zinc-400">•</span>
              <time className="text-xs text-zinc-400">{formatActionDate(post.date)}</time>
              {post.status === 'failed' && (
                <svg className="w-3 h-3 text-rose-600" viewBox="0 0 12 12" aria-label="Post failed" role="img">
                  <circle cx="6" cy="6" r="5.5" fill="currentColor" />
                </svg>
              )}
            </div>
            {post.tag && <TagBadge name={post.tag.name} color={post.tag.color} />}
            <div className="text-sm text-zinc-700 dark:text-zinc-300">{post.title}</div>
          </div>
          <div className="flex-shrink-0">
            <PostActions postAuthor={post.author} postId={post.id} currentTitle={post.title} currentTagId={post.tag?.id ?? null} zoneTags={zoneTags} />
          </div>
        </div>

        {post.image && (
          <div className="relative">
            <Image
              src={post.image}
              alt={post.title || `'${post.author}-მომხმარებლის სურათი`}
              width={1200}
              height={800}
              className={`w-full ${isPortrait ? 'h-[60vh]' : 'h-auto max-h-[60vh]'} object-contain transition-all`}
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                setIsPortrait(target.naturalHeight > target.naturalWidth);
              }}
            />
            <Link
              href={`#comments`}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 text-zinc-50 backdrop-blur-sm px-2.5 py-1 border border-zinc-100/20 hover:bg-zinc-900/90 transition"
              title="კონტრიბუციის ნახვა"
              aria-label="კონტრიბუციის ნახვა"
            >
              <MapPinIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{guessCount}</span>
              <span className="ml-2 text-sm font-semibold text-zinc-50 flex items-center gap-1">
                <MessageIcon className="w-4 h-4" />
                {commentCount}
              </span>
            </Link>
            {post.dateTaken && (
              <div className="absolute bottom-3 right-3 font-mono text-sm text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] select-none pointer-events-none tracking-widest">
                {formatPhotoTakenDate(post.dateTaken)}
              </div>
            )}
          </div>
        )}
      </article>

      <div id="comments">
        <PostComments
          comments={comments}
          postId={post.id}
          postAuthorAlias={post.author}
          isAuthor={isAuthor}
          canGuess={canGuess}
          currentUser={currentUser}
          postImage={post.image}
          postTitle={post.title || ''}
          guessCount={guessCount}
          onGuessSubmitted={handleGuessSubmitted}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </main>
  );
}
