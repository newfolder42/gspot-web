import Image from "next/image";
import Link from "next/link";
import type { GpsPostType } from "@/types/post";
import { formatPhotoTakenDate } from "@/lib/dates";
import TimePassed from "./common/time-passed";
import { useState } from "react";
import { MapPinIcon, MessageIcon } from "./icons";
import ProfileAvatar from "./common/profileAvatar";
import TagBadge from "./common/tag-badge";
import UserLink from "./common/user-link";
import PostStatsBadge from "./common/post-stats-badge";

export function GpsPostGridItem({ post }: { post: GpsPostType }) {
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
          <MapPinIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-semibold">{post.guessCount ?? 0}</span>
          <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-semibold text-zinc-50 flex items-center gap-1">
            <MessageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            {post.commentCount ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
export function GpsPost({ post, showZone }: { post: GpsPostType, showZone?: boolean }) {

  const [isPortrait, setIsPortrait] = useState(false);

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
      <div className="relative">
        <Link href={`/post/${post.id}`} className="block w-full">
          <Image
            src={post.imageVariants?.feed ?? post.image}
            alt={post.title || `'${post.author}-მომხმარებლის სურათი`}
            width={1200}
            height={800}
            className={`w-full ${isPortrait ? 'h-[60vh]' : 'h-auto max-h-[60vh]'} object-contain transition-all`}
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              setIsPortrait(target.naturalHeight > target.naturalWidth);
            }}
            priority={false}
          />
        </Link>
        {post.dateTaken && (
          <div className="absolute bottom-3 right-3 font-mono text-sm text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] select-none pointer-events-none tracking-widest">
            {formatPhotoTakenDate(post.dateTaken)}
          </div>
        )}
        <PostStatsBadge
          href={`/post/${post.id}#guesses`}
          guessCount={post.guessCount ?? 0}
          commentCount={post.commentCount ?? 0}
          title="გამოცნობების ნახვა"
        />
      </div>
    </article>
  );
}
