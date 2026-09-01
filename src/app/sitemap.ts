import { MetadataRoute } from 'next';
import { PUBLIC_SITE_URL } from '@/types/constants';
import { getSitemapPosts, getSitemapProfiles, getSitemapZones } from '@/lib/sitemap';

const baseUrl = `https://${PUBLIC_SITE_URL}`;

/** Rebuilt hourly — new posts should not wait for a deploy to be discoverable. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/explore-zones`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/new-users`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/heatmap`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const [posts, zones, profiles] = await Promise.all([
    getSitemapPosts(),
    getSitemapZones(),
    getSitemapProfiles(),
  ]);

  return [
    ...staticRoutes,
    ...zones.map(zone => ({
      url: `${baseUrl}${zone.path}`,
      lastModified: zone.lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...posts.map(post => ({
      url: `${baseUrl}${post.path}`,
      lastModified: post.lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...profiles.map(profile => ({
      url: `${baseUrl}${profile.path}`,
      lastModified: profile.lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
  ];
}
