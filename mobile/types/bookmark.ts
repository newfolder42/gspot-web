/**
 * One row of ჩამახსოვრებულები — just enough to recognise a saved post and open it, not the
 * post itself. `id` is the bookmark's own id and the page cursor (newest save first).
 */
export type PostBookmarkType = {
  id: number;
  postId: number;
  savedAt: string;
  type: 'gps-photo' | 'text' | 'quest-completion' | 'hide-and-seek';
  title: string;
  author: string;
  zoneSlug: string;
  zoneProfilePhoto: string | null;
  /** Small rendition of the post's first photo; null for a post without one. */
  thumbnail: string | null;
  /** quest-completion posts only. */
  questTitle: string | null;
  /** The viewer already guessed it, so it is no longer something left to do. */
  userHasGuessed: boolean;
};
