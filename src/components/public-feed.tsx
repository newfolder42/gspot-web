'use client';

import { useState, useEffect, useRef } from 'react';
import { GpsPost } from './post-gps';
import { GpsPostType } from '@/types/post';
import { loadPublicPosts } from '@/actions/feed';
import { POSTS_PER_PAGE } from '@/types/constants';

export default function PublicFeed() {
  const [posts, setPosts] = useState<GpsPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const postsRef = useRef<GpsPostType[]>([]);
  const loadingRef = useRef(true);

  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      try {
        const fetched = await loadPublicPosts({ limit: POSTS_PER_PAGE });
        if (cancelled) return;
        setPosts(fetched);
        setHasMore(fetched.length === POSTS_PER_PAGE);
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

    try {
      const newPosts = await loadPublicPosts({
        cursor: { ids: currentPosts.map(p => +p.id) },
        limit: POSTS_PER_PAGE,
      });

      if (newPosts.length < POSTS_PER_PAGE) {
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
      { threshold: 0.1, rootMargin: '200px' }
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

  return (
    <div className="max-w-4xl mx-auto mt-2 space-y-4">
      {loading && posts.length === 0 && (
        <div className="flex justify-center py-8 text-gray-500">იტვირთება...</div>
      )}
      {posts.map(post => <GpsPost key={post.id} post={post} showZone />)}

      {hasMore && (
        <div ref={observerTarget} className="flex justify-center py-4">
          {loading && (
            <div className="text-gray-500">მეტი პოსტის ჩვენება...</div>
          )}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-4 text-gray-500">
          მეტი პოსტის ნახვისთვის გაიარე რეგისტრაცია/ავტორიზაცია
        </div>
      )}
    </div>
  );
}
