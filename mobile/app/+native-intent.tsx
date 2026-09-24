/**
 * Rewrites incoming gspot.ge links (Android App Links, see intentFilters in
 * app.json) onto the matching native screens. Web and app paths mostly agree;
 * profiles are the exception (/account/:alias on web, /user/:alias here).
 * Anything that isn't a gspot.ge web link, e.g. gspot:// or dev-client URLs,
 * passes through untouched.
 */
const WEB_LINK = /^https?:\/\/(?:www\.)?gspot\.ge(\/[^?#]*)?(\?[^#]*)?/i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const match = path.match(WEB_LINK);
    if (!match) return path;

    const segments = (match[1] ?? '/').split('/').filter(Boolean);
    const query = match[2] ?? '';

    // /post/:id[?commentId=]
    if (segments[0] === 'post' && segments[1]) {
      return `/post/${segments[1]}${query}`;
    }

    // /account/:alias[/achievements|/guesses|...]: the app has one profile screen per user
    if (segments[0] === 'account' && segments[1]) {
      return `/user/${segments[1]}`;
    }

    if (segments[0] === 'zone' && segments[1]) {
      const slug = segments[1];
      // /zone/:slug/quests/:questId (not quests/new or the moderation pages)
      if (segments[2] === 'quests' && /^\d+$/.test(segments[3] ?? '') && segments.length === 4) {
        return `/zone/${slug}/quests/${segments[3]}`;
      }
      // /zone/:slug/characters/:characterSlug
      if (segments[2] === 'characters' && segments[3]) {
        return `/zone/${slug}/characters/${segments[3]}`;
      }
      // Other zone pages (leaderboard, settings, submit, ...) land on the zone itself.
      return `/zone/${slug}`;
    }

    return '/';
  } catch {
    return '/';
  }
}
