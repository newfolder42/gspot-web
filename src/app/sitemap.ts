import { query } from '@/lib/db';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://gspot.ge';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/new-users`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ];

  // Get published posts (limit to 1000 most recent)
  const postsResult = await query(
    `SELECT id, created_at FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 1000`
  );

  const posts = postsResult.rows.map((post) => ({
    url: `${baseUrl}/post/${post.id}`,
    lastModified: new Date(post.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Get user profiles (limit to 500 most recent)
  const usersResult = await query(
    `SELECT alias, created_at FROM users ORDER BY created_at DESC LIMIT 500`
  );

  const users = usersResult.rows.map((user) => ({
    url: `${baseUrl}/account/${user.alias}`,
    lastModified: new Date(user.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...posts, ...users];
}
