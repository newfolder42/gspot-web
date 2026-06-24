'use client';

import { useEffect, useRef, useState } from 'react';
import { GpsPost, GpsPostGridItem } from './post-gps';
import { QuestCompletionPost, QuestCompletionGridItem } from './post-quest';
import { FeedType, FeedView, FeedPostType } from '@/types/post';
import { loadPosts } from '@/actions/feed';
import { POSTS_PER_PAGE, POSTS_PER_PAGE_GRID } from '@/types/constants';

type FeedClientProps = {
  userId?: number | null;
  accountUserId?: number;
  type: FeedType;
  zoneId?: number | null;
  view?: FeedView;
};

export default function FeedClient({
  userId,
  accountUserId,
  type,
  zoneId,
  view = 'timeline',
}: FeedClientProps) {
  const postsPerPage = view === 'grid' ? POSTS_PER_PAGE_GRID : POSTS_PER_PAGE;

  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const postsRef = useRef<FeedPostType[]>([]);
  const loadingRef = useRef(true);

  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      try {
        const fetched = await loadPosts({ type, userId, accountUserId, zoneId, limit: postsPerPage });
        if (cancelled) return;
        setPosts(fetched);
        setHasMore(fetched.length === postsPerPage);
      } catch (error) {
        if (!cancelled) console.error('Failed to load initial posts:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInitial();
    return () => { cancelled = true; };
  }, []);

  const loadMore = async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    const currentPosts = postsRef.current;
    const lastPost = currentPosts[currentPosts.length - 1];
    const cursor = {
      date: lastPost.date,
      id: +lastPost.id,
      ids: currentPosts.map(p => +p.id),
    };

    try {
      const newPosts = await loadPosts({
        type,
        userId,
        accountUserId,
        zoneId,
        cursor,
        limit: postsPerPage,
      });

      if (newPosts.length < postsPerPage) {
        setHasMore(false);
      }

      setPosts(prev => [...prev, ...newPosts]);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px'
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore]);

  if (view === 'grid') {
    return (
      <div>
        {loading && posts.length === 0 && (
          <div className="flex justify-center py-8 text-gray-500">იტვირთება...</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '4px' }}>
          {posts.map(post => post.type === 'quest-completion'
            ? <QuestCompletionGridItem key={post.id} post={post} />
            : <GpsPostGridItem key={post.id} post={post} />
          )}
        </div>

        {hasMore && (
          <div ref={observerTarget} className="flex justify-center py-4">
            {loading && (
              <div className="text-gray-500">მეტი პოსტის ჩვენება...</div>
            )}
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="text-center py-4 text-gray-500">
            {type === 'public' ? 'მეტი პოსტის ნახვისთვის გაიარე რეგისტრაცია/ავტორიზაცია' : 'მეტი პოსტი არ არის'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className='mt-2 space-y-4'>
      {loading && posts.length === 0 && (
        <div className="flex justify-center py-8 text-gray-500">იტვირთება...</div>
      )}
      {posts.map(post => post.type === 'quest-completion'
        ? <QuestCompletionPost key={post.id} post={post} showZone={type !== 'zone'} />
        : <GpsPost key={post.id} post={post} showZone={type !== 'zone'} />
      )}

      {hasMore && (
        <div
          ref={observerTarget}
          className="flex justify-center py-4"
        >
          {loading && (
            <div className="text-gray-500">მეტი პოსტის ჩვენება...</div>
          )}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-4 text-gray-500">
          {type === 'public' ? 'მეტი პოსტის ნახვისთვის გაიარე რეგისტრაცია/ავტორიზაცია' : 'მეტი პოსტი არ არის'}
        </div>
      )}
    </div>
  );
}
