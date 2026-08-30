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
import { QuestCompletionTitle } from './post-quest';
import type { PostDetailType } from '@/types/post-detail';
import { formatPhotoTakenDate } from '@/lib/dates';
import TimePassed from './common/time-passed';
import type { PostGuessType } from '@/types/post-guess';
import type { PostCommentType } from '@/types/post-comment';
import type { VoteSummaryType } from '@/types/vote';
import type { RewardSummaryType } from '@/types/reward';
import type { ZoneTag } from '@/types/tag';
import HideAndSeekPanel from './hide-and-seek/hide-and-seek-panel';

type PostDetailClientProps = {
  post: PostDetailType;
  comments: PostCommentType[];
  currentUser: string;
  currentUserId: number | null;
  zoneTags: ZoneTag[];
  postVotes: VoteSummaryType;
  postRewards: RewardSummaryType;
};

export default function PostDetailClient({ post, comments, currentUser, currentUserId, zoneTags, postVotes, postRewards }: PostDetailClientProps) {
  const isAuthor = currentUser === post.author;
  const questPost = post.type === 'quest-completion' ? post : null;
  const gpsPost = post.type === 'gps-photo' ? post : null;
  const gamePost = post.type === 'hide-and-seek' ? post : null;
  const isHideAndSeekHost = !!gamePost && currentUserId === gamePost.game.hostId;
  const userCanGuess = !!gpsPost && !!currentUser && !isAuthor && !gpsPost.alreadyGuessed;

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

        {questPost && questPost.photos.length > 0 && (
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
          </div>
        )}
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
            {gpsPost.dateTaken && (
              <div className="absolute bottom-3 right-3 font-mono text-sm text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] select-none pointer-events-none tracking-widest">
                {formatPhotoTakenDate(gpsPost.dateTaken)}
              </div>
            )}
          </div>
        )}
      </article>

      {gamePost && (
        <div className="px-2 pb-2">
          <HideAndSeekPanel
            game={gamePost.game}
            players={gamePost.players}
            currentUserId={currentUserId}
          />
        </div>
      )}

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
          commentCount={commentCount}
          showGuessStat={!!gpsPost}
          isHideAndSeekHost={isHideAndSeekHost}
          postVoteScore={postVotes.score}
          userPostVote={postVotes.userVote}
          postRewards={postRewards.rewards}
          userPostReward={postRewards.userReward}
          onGuessSubmitted={handleGuessSubmitted}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </main>
  );
}
