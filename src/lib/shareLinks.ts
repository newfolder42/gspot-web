import { query } from './db';
import { PUBLIC_SITE_URL } from '@/types/constants';

export type ShareLink = {
  alias: string;
  targetUrl: string;
};

// Aliases are printed on stickers, so keep the accepted shape tight: letters,
// digits, dash and underscore. Anything else is a scanner artifact, not a link.
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidAlias(alias: string): boolean {
  return ALIAS_PATTERN.test(alias);
}

/**
 * Look up an active share link and count the hit in the same statement, so a
 * scan is one round-trip and the counter cannot drift from the redirect.
 * Returns null for unknown or deactivated aliases.
 */
export async function resolveShareLink(alias: string): Promise<ShareLink | null> {
  if (!isValidAlias(alias)) {
    return null;
  }

  const result = await query(
    `UPDATE share_links
        SET hit_count = hit_count + 1,
            last_hit_at = NOW()
      WHERE LOWER(alias) = LOWER($1)
        AND is_active
      RETURNING alias, target_url`,
    [alias]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    alias: result.rows[0].alias,
    targetUrl: result.rows[0].target_url,
  };
}

/**
 * The origin relative targets resolve against. Never the request origin in
 * production: behind the proxy Next can see `localhost:3000`, which would send
 * a scanner to their own device. Locally the request origin is what we want.
 */
export function getSiteOrigin(requestOrigin: string): string {
  return process.env.NODE_ENV === 'production'
    ? `https://${PUBLIC_SITE_URL}`
    : requestOrigin;
}

/**
 * Turn a stored target into an absolute URL. Relative targets ("/?utm_source=…")
 * resolve against the site origin. Query params that came in
 * with the scan are carried over unless the target already sets them, so a
 * campaign can add ?utm_campaign=… without a new row.
 */
export function buildRedirectUrl(
  targetUrl: string,
  origin: string,
  incoming: URLSearchParams
): string {
  const url = new URL(targetUrl, origin);

  for (const [key, value] of incoming.entries()) {
    if (!url.searchParams.has(key)) {
      url.searchParams.append(key, value);
    }
  }

  return url.toString();
}
