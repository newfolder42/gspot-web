'use client';

import { useEffect, useRef, useState } from 'react';
import { GpsPost } from './post-gps';
import { FeedFilter, FeedType, GpsPostType } from '@/types/post';
import { loadPosts } from '@/actions/feed';
import { POSTS_PER_PAGE } from '@/types/constants';

type FeedClientProps = {
  userId?: number | null;
  accountUserId?: number;
  type: FeedType;
  zoneId?: number | null;
  filter: FeedFilter;
};

export default function FeedClient({
  userId,
  accountUserId,
  type,
  zoneId,
  filter
}: FeedClientProps) {
  const [posts, setPosts] = useState<GpsPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const prevFilterRef = useRef(filter);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const fetched = await loadPosts({ type, userId, accountUserId, zoneId, filter });
        setPosts(fetched);
        setHasMore(fetched.length === POSTS_PER_PAGE);
      } catch (error) {
        console.error('Failed to load initial posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (prevFilterRef.current !== filter) {
      prevFilterRef.current = filter;

      const reloadPosts = async () => {
        setLoading(true);
        try {
          const newPosts = await loadPosts({
            type,
            userId,
            accountUserId,
            zoneId,
            filter,
          });
          setPosts(newPosts);
          setHasMore(newPosts.length === POSTS_PER_PAGE);
        } catch (error) {
          console.error('Failed to reload posts:', error);
        } finally {
          setLoading(false);
        }
      };

      reloadPosts();
    }
  }, [filter, type, userId, accountUserId, zoneId]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    const lastPost = posts[posts.length - 1];
    const cursor = {
      shownCount: posts.length,
      guessCount: lastPost.guessCount ?? 0,
      date: lastPost.date,
      id: +lastPost.id
    };

    try {
      const newPosts = await loadPosts({
        type,
        userId,
        accountUserId,
        zoneId,
        cursor,
        filter,
      });

      if (newPosts.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }

      setPosts(prev => [...prev, ...newPosts]);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
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
  }, [hasMore, loading, posts]);

  return (
    <div className='mt-2 space-y-4'>
      {loading && posts.length === 0 && (
        <div className="flex justify-center py-8 text-gray-500">იტვირთება...</div>
      )}
      {posts.map(post => (
        <GpsPost key={post.id} post={post} showZone={type !== 'zone'} />
      ))}

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
