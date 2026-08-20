// src/app/robots.ts
import { MetadataRoute } from 'next';
import { PUBLIC_SITE_URL } from '@/types/constants';

/**
 * Only routes that should never be *fetched* belong here — anything that
 * redirects to sign-in, or is gated to one user. Pages that may be fetched but
 * should not be indexed (the account sub-tabs) carry `robots: { index: false }`
 * metadata instead: a Disallow here would stop Googlebot from ever reading that
 * tag, which would leave them indexable-by-link forever.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        // redirect anonymous visitors straight to /auth/signin
        '/settings',
        '/notifications',
        '/submit',
        '/to-guess',
        '/new-zone',
        '/quests',
        // owner-only: 404s for every crawler
        '/account/*/heatmap',
        // zone routes gated on membership or moderator rights
        '/zone/*/settings',
        '/zone/*/submit',
        '/zone/*/quests/new',
        '/zone/*/quests/moderation',
      ],
    },
    sitemap: `https://${PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
