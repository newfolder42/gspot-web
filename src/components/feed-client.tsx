'use client';

import { useEffect, useRef, useState } from 'react';
import { GpsPost } from './post-gps';
import { GpsPostType } from '@/types/post';
import { loadPosts } from '@/actions/feed';
import { POSTS_PER_PAGE } from '@/lib/constants';

type FeedClientProps = {
  initialPosts: GpsPostType[];
  userId: number;
  accountUserId?: number;
  type: 'account-feed' | 'global-feed' | 'connections-feed';
};

export default function FeedClient({ 
  initialPosts, 
  userId, 
  accountUserId,
  type
}: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === POSTS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    
    const lastPost = posts[posts.length - 1];
    const cursor = { 
      date: lastPost.date, 
      id: lastPost.id 
    };

    try {
      const newPosts = await loadPosts({
        type,
        userId,
        accountUserId,
        cursor,
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
    <>
      {posts.map((post, idx) => {
        const spacing = idx === 0 ? 'mt-2' : 'mt-4';
        return (
          <div key={post.id} className={spacing}>
            <GpsPost post={post} />
          </div>
        );
      })}
      
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
          მეტი პოსტი არ არის
        </div>
      )}
    </>
  );
}
