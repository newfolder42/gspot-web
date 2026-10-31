'use client';

import { useState, useEffect, useRef } from 'react';
import { GpsPost } from '../post-gps';
import { QuestCompletionPost, QuestCompletionGridItem } from '../post-quest';
import { HideAndSeekPost } from '../hide-and-seek/hide-and-seek-post';
import { FeedPostType } from '@/types/post';
import { loadZonePosts, loadQuestCompletionPosts } from '@/actions/feed';
import { POSTS_PER_PAGE, POSTS_PER_PAGE_GRID } from '@/types/constants';
import type { ZoneTag } from '@/types/tag';
import TagFilterPicker from '@/components/common/tag-filter-picker';

type ZoneFeedProps = {
  userId?: number | null;
  zoneId: number;
  tags: ZoneTag[];
  /** Lists only this quest's completion posts (the quest's "completed quests" page). */
  questId?: number;
};

export default function ZoneFeed({ userId, zoneId, tags, questId }: ZoneFeedProps) {
  const [tagId, setTagId] = useState<number | null>(null);
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const prevTagIdRef = useRef(tagId);
  // A quest's completions are a grid of thumbnails, so a page is a whole number of rows.
  const pageSize = questId ? POSTS_PER_PAGE_GRID : POSTS_PER_PAGE;

  const fetchPosts = async (t: number | null, append = false, cursor?: { date: string; id: number }) => {
    setLoading(true);
    try {
      const fetched = questId
        ? await loadQuestCompletionPosts({ questId, cursor, limit: pageSize })
        : await loadZonePosts({ zoneId, userId, tagId: t, cursor });
      if (append) {
        setPosts(prev => [...prev, ...fetched]);
      } else {
        setPosts(fetched);
      }
      setHasMore(fetched.length === pageSize);
    } catch (err) {
      console.error('ZoneFeed load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(tagId);
  }, []);

  useEffect(() => {
    if (prevTagIdRef.current !== tagId) {
      prevTagIdRef.current = tagId;
      fetchPosts(tagId);
    }
  }, [tagId]);

  const loadMore = async () => {
    if (loading || !hasMore || posts.length === 0) return;
    const last = posts[posts.length - 1];
    await fetchPosts(tagId, true, { date: last.date, id: +last.id });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore();
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    const el = observerTarget.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, posts]);

  const hasTags = tags.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 pb-2 flex flex-wrap items-center gap-3">
        {hasTags && (
          <TagFilterPicker tags={tags} selectedTagId={tagId} onChange={setTagId} noneLabel="ყველა თეგი" />
        )}
      </div>

      {/* Post list */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">პოსტები არ მოიძებნა</p>
      ) : questId ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '4px' }}>
          {posts.map(post => post.type === 'quest-completion'
            ? <QuestCompletionGridItem key={post.id} post={post} caption="author" />
            : null
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => post.type === 'quest-completion'
            ? <QuestCompletionPost key={post.id} post={post} isLoggedIn={!!userId} />
            : post.type === 'hide-and-seek' ? <HideAndSeekPost key={post.id} post={post} />
            : <GpsPost key={post.id} post={post} isLoggedIn={!!userId} />
          )}
        </div>
      )}

      {loading && posts.length > 0 && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div ref={observerTarget} className="h-4" />
    </div>
  );
}
