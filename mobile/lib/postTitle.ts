/**
 * What a guess post's title has to look like before the app lets it through.
 *
 * Enforced in the app only. The API still accepts a missing or short title: builds already
 * installed send whatever was typed (an empty string included), and a v1 endpoint that
 * started refusing that would break them. Mirrors `src/lib/post-title.ts` on the web.
 */

/** Three is the floor because real place names get that short ("ონი"). */
export const MIN_POST_TITLE_LENGTH = 2;

/** Characters as typed, not UTF-16 units, so an emoji counts once. */
export function postTitleLength(title: string): number {
  return [...title.trim()].length;
}

export function isValidPostTitle(title: string): boolean {
  return postTitleLength(title) >= MIN_POST_TITLE_LENGTH;
}

/** The sentence to show for a title that is not allowed, or `null` when it is fine. */
export function postTitleError(title: string): string | null {
  const length = postTitleLength(title);
  if (length === 0) return 'სათაური სავალდებულოა';
  if (length < MIN_POST_TITLE_LENGTH) return `სათაური უნდა იყოს მინიმუმ ${MIN_POST_TITLE_LENGTH} სიმბოლო`;
  return null;
}
