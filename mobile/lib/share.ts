import { Share } from 'react-native';

export const WEB_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://gspot.ge').replace(/\/$/, '');

/** Absolute website URL for an app path like `/post/12`. */
export function webUrl(path: string): string {
  return `${WEB_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Opens the system share sheet with the public web link. The website renders a
 * link preview for every shared page, so the link alone is enough; `title` just
 * leads the message. Android ignores Share's `url` field, hence the URL in `message`.
 */
export async function shareLink({ path, title }: { path: string; title?: string }): Promise<void> {
  const url = webUrl(path);
  try {
    await Share.share(title ? { message: `${title}\n${url}`, title } : { message: url });
  } catch {
    // Dismissed or no share target; nothing to report.
  }
}
