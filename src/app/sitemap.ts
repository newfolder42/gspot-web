import { MetadataRoute } from 'next';
import { query } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://gspot.ge';

  const usersResult = await query(
    `SELECT alias, created_at FROM users WHERE alias IS NOT NULL ORDER BY created_at DESC`,
    []
  );

  const userEntries: MetadataRoute.Sitemap = usersResult.rows.map((user) => ({
    url: `${baseUrl}/account/${user.alias}`,
    lastModified: new Date(user.created_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    ...userEntries,
  ];
}
