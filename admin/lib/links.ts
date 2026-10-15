// Public site the admin links out to. Hard-coded: the admin has no knowledge of the web app.
const WEB_URL = 'https://gspot.ge';

export function postUrl(postId: number): string {
  return `${WEB_URL}/post/${postId}`;
}

export function accountUrl(alias: string): string {
  return `${WEB_URL}/account/${encodeURIComponent(alias)}`;
}
