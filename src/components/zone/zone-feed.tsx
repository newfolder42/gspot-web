'use client';

import { useState, useEffect, useRef } from 'react';
import { GpsPost } from '../post-gps';
import { QuestCompletionPost } from '../post-quest';
import { FeedPostType } from '@/types/post';
import { loadZonePosts } from '@/actions/feed';
import { POSTS_PER_PAGE } from '@/types/constants';
import type { ZoneTag } from '@/types/tag';
import TagFilterPicker from '@/components/common/tag-filter-picker';

type ZoneFeedProps = {
  userId?: number | null;
  zoneId: number;
  tags: ZoneTag[];
};

export default function ZoneFeed({ userId, zoneId, tags }: ZoneFeedProps) {
  const [tagId, setTagId] = useState<number | null>(null);
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const prevTagIdRef = useRef(tagId);

  const fetchPosts = async (t: number | null, append = false, cursor?: { date: string; id: number }) => {
    setLoading(true);
    try {
      const fetched = await loadZonePosts({ zoneId, userId, tagId: t, cursor });
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
      ) : (
        <div className="space-y-4">
          {posts.map(post => post.type === 'quest-completion'
            ? <QuestCompletionPost key={post.id} post={post} />
            : <GpsPost key={post.id} post={post} />
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
