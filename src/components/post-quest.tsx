import Image from "next/image";
import Link from "next/link";
import type { QuestCompletionPostType } from "@/types/post";
import TimePassed from "./common/time-passed";
import ProfileAvatar from "./common/profileAvatar";
import UserLink from "./common/user-link";
import PostStatsBadge from "./common/post-stats-badge";
import { FlagIcon, TrophyIcon } from "./icons";

export function QuestCompletionTitle({ questTitle }: { questTitle: string | null }) {
  return <>{questTitle ? `შეასრულა მისია ${questTitle}` : 'შეასრულა მისია'}</>;
}

export function QuestCompletionGridItem({ post }: { post: QuestCompletionPostType }) {
  const cover = post.photos[0];

  return (
    <Link href={`/post/${post.id}`} className="block group">
      <div
        className="bg-zinc-100 dark:bg-zinc-900"
        style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden' }}
      >
        {cover ? (
          <Image
            src={cover.variants?.thumb ?? cover.url}
            alt={post.questTitle || 'მისიის ფოტო'}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 33vw, 300px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-600 dark:to-amber-800">
            <FlagIcon className="w-8 h-8 text-white" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 pointer-events-none">
          <FlagIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 drop-shadow" />
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 pointer-events-none">
          <span className="text-xs font-medium text-white drop-shadow-sm line-clamp-1">
            <QuestCompletionTitle questTitle={post.questTitle} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function QuestCompletionPost({ post, showZone }: { post: QuestCompletionPostType, showZone?: boolean }) {
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
            <svg className="w-3 h-3 text-rose-600" viewBox="0 0 12 12" aria-label="Post failed" role="img">
              <circle cx="6" cy="6" r="5.5" fill="currentColor" />
            </svg>
          )}
        </div>
        <Link
          href={`/zone/${post.zoneSlug}/quests/${post.questId}`}
          className="inline-block mt-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
        >
          <QuestCompletionTitle questTitle={post.questTitle} />
        </Link>
      </div>
      {post.photos.length > 0 ? (
        <div className="relative">
          <div className={`grid gap-0.5 ${post.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.photos.map((photo, idx) => (
              <Link key={idx} href={`/post/${post.id}`} className="block relative aspect-square overflow-hidden">
                <Image src={photo.variants?.feed ?? photo.url} alt={photo.objectiveTitle || ''} fill className="object-cover" />
                {photo.objectiveTitle && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
                    <span className="text-xs font-medium text-white drop-shadow-sm">{photo.objectiveTitle}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
          <PostStatsBadge href={`/post/${post.id}#comments`} commentCount={post.commentCount ?? 0} title="კომენტარების ნახვა" />
        </div>
      ) : (
        <PostStatsBadge
          href={`/post/${post.id}#comments`}
          commentCount={post.commentCount ?? 0}
          title="კომენტარების ნახვა"
          className="mx-2 mb-2"
        />
      )}
    </article>
  );
}
