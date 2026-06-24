"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import PostActions from './post-actions';
import PostComments from './post-comments';
import ProfileAvatar from './common/profileAvatar';
import TagBadge from './common/tag-badge';
import UserLink from './common/user-link';
import ZoomableImage from './common/zoomable-image';
import PostStatsBadge from './common/post-stats-badge';
import { QuestCompletionTitle } from './post-quest';
import type { FeedPostType } from '@/types/post';
import { formatPhotoTakenDate } from '@/lib/dates';
import TimePassed from './common/time-passed';
import type { PostGuessType } from '@/types/post-guess';
import type { PostCommentType } from '@/types/post-comment';
import type { ZoneTag } from '@/types/tag';

type PostDetailClientProps = {
  post: FeedPostType;
  comments: PostCommentType[];
  currentUser: string;
  alreadyGuessed: boolean;
  zoneTags: ZoneTag[];
};

export default function PostDetailClient({ post, comments, currentUser, alreadyGuessed, zoneTags }: PostDetailClientProps) {
  const isAuthor = currentUser === post.author;
  const questPost = post.type === 'quest-completion' ? post : null;
  const gpsPost = post.type === 'gps-photo' ? post : null;
  const userCanGuess = !questPost && !!currentUser && !isAuthor && !alreadyGuessed;

  const [isPortrait, setIsPortrait] = useState(false);
  const [canGuess, setCanGuess] = useState(userCanGuess);
  const [guessCount, setGuessCount] = useState(Number(gpsPost?.guessCount) || 0);

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
                  name={post.zoneSlug}
                  photoUrl={post.zoneProfilePhoto}
                  className="w-6 h-6 rounded-md flex-shrink-0"
                  initialsClassName="text-[8px] font-bold"
                  width={24}
                  height={24}
                />
                {post.zoneSlug}
              </Link>
              <span className="text-xs text-zinc-400">•</span>
              <UserLink alias={post.author} level={post.authorLevel} className="text-sm" />
              <span className="text-xs text-zinc-400">•</span>
              <TimePassed date={post.date} className="text-xs text-zinc-400" />
              {post.status === 'failed' && (
                <svg className="w-3 h-3 text-rose-600" viewBox="0 0 12 12" aria-label="Post failed" role="img">
                  <circle cx="6" cy="6" r="5.5" fill="currentColor" />
                </svg>
              )}
            </div>
            {gpsPost?.tag && <TagBadge name={gpsPost.tag.name} color={gpsPost.tag.color} />}
            {gpsPost && (
              <div className="text-sm text-zinc-700 dark:text-zinc-300">{post.title}</div>
            )}
            {questPost && (
              <Link
                href={`/zone/${post.zoneSlug}/quests/${questPost.questId}`}
                className="inline-block mt-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <QuestCompletionTitle questTitle={questPost.questTitle} />
              </Link>
            )}
          </div>
          <div className="flex-shrink-0">
            <PostActions postAuthor={post.author} postId={post.id} currentTitle={post.title} currentTagId={gpsPost?.tag?.id ?? null} zoneTags={zoneTags} />
          </div>
        </div>

        {questPost && (questPost.photos.length > 0 ? (
          <div className="relative">
            <div className={`grid gap-0.5 ${questPost.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {questPost.photos.map((photo, idx) => (
                <ZoomableImage key={idx} className="relative aspect-square">
                  <Image src={photo.variants?.feed ?? photo.url} alt={photo.objectiveTitle || ''} fill className="object-cover" />
                  {photo.objectiveTitle && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 pointer-events-none">
                      <span className="text-xs font-medium text-white drop-shadow-sm">{photo.objectiveTitle}</span>
                    </div>
                  )}
                </ZoomableImage>
              ))}
            </div>
            <PostStatsBadge href="#comments" commentCount={commentCount} title="კონტრიბუციის ნახვა" />
          </div>
        ) : (
          <PostStatsBadge href="#comments" commentCount={commentCount} title="კონტრიბუციის ნახვა" className="mx-2 mb-2" />
        ))}
        {gpsPost && gpsPost?.image && (
          <div className="relative">
            <ZoomableImage className={`w-full ${isPortrait ? 'h-[60vh]' : 'h-auto max-h-[60vh]'}`}>
              <Image
                src={gpsPost.image}
                alt={post.title || `'${post.author}-მომხმარებლის სურათი`}
                width={1200}
                height={800}
                className={`w-full ${isPortrait ? 'h-[60vh]' : 'h-auto max-h-[60vh]'} object-contain transition-all`}
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement;
                  setIsPortrait(target.naturalHeight > target.naturalWidth);
                }}
              />
            </ZoomableImage>
            <PostStatsBadge
              href="#comments"
              guessCount={guessCount}
              commentCount={commentCount}
              title="კონტრიბუციის ნახვა"
            />
            {gpsPost.dateTaken && (
              <div className="absolute bottom-3 right-3 font-mono text-sm text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] select-none pointer-events-none tracking-widest">
                {formatPhotoTakenDate(gpsPost.dateTaken)}
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
          postImage={gpsPost?.image}
          postTitle={post.title || ''}
          guessCount={guessCount}
          onGuessSubmitted={handleGuessSubmitted}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </main>
  );
}
