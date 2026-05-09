'use client';

import { useState, useEffect, useRef } from 'react';
import { GpsPost } from '../post-gps';
import { FeedFilter, GpsPostType } from '@/types/post';
import { loadPosts } from '@/actions/feed';
import { POSTS_PER_PAGE } from '@/types/constants';
import type { ZoneTag } from '@/types/tag';
import TagFilterPicker from '@/components/common/tag-filter-picker';

type ZoneFeedProps = {
  userId?: number | null;
  zoneId: number;
  tags: ZoneTag[];
};

export default function ZoneFeed({ userId, zoneId, tags }: ZoneFeedProps) {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [tagId, setTagId] = useState<number | null>(null);
  const [posts, setPosts] = useState<GpsPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const prevFilterRef = useRef(filter);
  const prevTagIdRef = useRef(tagId);

  const fetchPosts = async (f: FeedFilter, t: number | null, append = false, cursor?: { date: string; id: number }) => {
    setLoading(true);
    try {
      const fetched = await loadPosts({ type: 'zone', zoneId, userId, filter: f, tagId: t, cursor });
      if (append) {
        setPosts(prev => [...prev, ...fetched]);
      } else {
        setPosts(fetched);
      }
      setHasMore(fetched.length === POSTS_PER_PAGE);
    } catch (err) {
      console.error('ZoneFeed load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(filter, tagId);
  }, []);

  useEffect(() => {
    if (prevFilterRef.current !== filter || prevTagIdRef.current !== tagId) {
      prevFilterRef.current = filter;
      prevTagIdRef.current = tagId;
      fetchPosts(filter, tagId);
    }
  }, [filter, tagId]);

  const loadMore = async () => {
    if (loading || !hasMore || posts.length === 0) return;
    const last = posts[posts.length - 1];
    await fetchPosts(filter, tagId, true, { date: last.date, id: +last.id });
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
      {/* Filter bar */}
      <div className="mb-4 pb-2 flex flex-wrap items-center gap-3">
        {userId && (
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FeedFilter)}
            className="px-3 py-2 rounded-md text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">ყველა პოსტი</option>
            <option value="guessed">გამოცნობილი</option>
            <option value="not-guessed">გამოსაცნობი</option>
          </select>
        )}

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
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <GpsPost key={post.id} post={post} />
          ))}
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
