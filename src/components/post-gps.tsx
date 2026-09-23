import Image from "next/image";
import Link from "next/link";
import type { GpsPostType } from "@/types/post";
import TimePassed from "./common/time-passed";
import { MapPinIcon, MessageIcon, UpvoteIcon } from "./icons";
import ProfileAvatar from "./common/profileAvatar";
import TagBadge from "./common/tag-badge";
import UserLink from "./common/user-link";
import PostPhoto from "./common/post-photo";
import PostActionBar from "./post-action-bar";
import RewardIcon from "./rewards/reward-icons";

export function GpsPostGridItem({ post }: { post: GpsPostType }) {
  const given = (post.rewards ?? []).filter((r) => r.count > 0);
  const topReward = given.length > 0 ? given.reduce((a, b) => (b.count > a.count ? b : a)) : null;
  const rewardTotal = given.reduce((sum, r) => sum + r.count, 0);

  return (
    <Link href={`/post/${post.id}`} className="block group">
      <div
        className="bg-zinc-100 dark:bg-zinc-900"
        style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden' }}
      >
        <Image
          src={post.imageVariants?.thumb ?? post.image}
          alt={post.title || `'${post.author}-მომხმარებლის სურათი`}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 33vw, 300px"
        />
        <div className="absolute top-1.5 right-0 sm:top-3 sm:right-0 inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-zinc-900/80 text-zinc-50 backdrop-blur-sm px-1.5 py-0.5 sm:px-2.5 sm:py-1 border border-zinc-100/20 pointer-events-none">
          <UpvoteIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-semibold">{post.voteScore ?? 0}</span>
          <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-semibold text-zinc-50 flex items-center gap-1">
            <MapPinIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            {post.guessCount ?? 0}
          </span>
          <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-semibold text-zinc-50 flex items-center gap-1">
            <MessageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            {post.commentCount ?? 0}
          </span>
          {topReward && (
            <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-semibold text-zinc-50 flex items-center gap-1">
              <RewardIcon iconUrl={topReward.iconUrl} name={topReward.name} className="w-3 h-3 sm:w-4 sm:h-4" />
              {rewardTotal}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
export function GpsPost({ post, showZone, isLoggedIn }: { post: GpsPostType, showZone?: boolean, isLoggedIn: boolean }) {
  return (
    <article className="overflow-hidden">
      <div className="p-2">
        <div className="flex items-center gap-1.5">
          {showZone && (
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
          )}
          {showZone && (
            <span className="text-xs text-zinc-400">•</span>
          )}
          <UserLink alias={post.author} level={post.authorLevel} className="text-sm" />
          <span className="text-xs text-zinc-400">•</span>
          <TimePassed date={post.date} className="text-xs text-zinc-400" />
          {post.status === 'failed' && (
            <svg
              className="w-3 h-3 text-rose-600"
              viewBox="0 0 12 12"
              aria-label="Post failed"
              role="img"
            >
              <circle cx="6" cy="6" r="5.5" fill="currentColor" />
            </svg>
          )}
        </div>
        {post.tag && <TagBadge name={post.tag.name} color={post.tag.color} />}
        <div className="text-sm text-zinc-700 dark:text-zinc-300">{post.title}</div>
      </div>
      <PostPhoto
        src={post.imageVariants?.feed ?? post.image}
        alt={post.title || `'${post.author}-მომხმარებლის სურათი`}
        dateTaken={post.dateTaken}
        href={`/post/${post.id}`}
      />
      <div className="px-2 py-2">
        <PostActionBar
          postId={post.id}
          voteScore={post.voteScore ?? 0}
          userVote={post.userVote ?? null}
          rewards={post.rewards ?? []}
          userReward={post.userReward ?? null}
          isLoggedIn={isLoggedIn}
          guessCount={post.guessCount ?? 0}
          commentCount={post.commentCount ?? 0}
          href={`/post/${post.id}#comments`}
        />
      </div>
    </article>
  );
}
