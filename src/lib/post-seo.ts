import { APP_NAME } from '@/types/constants';

/** Longest title worth putting in `<title>`; search results cut it off around here. */
const SEO_TITLE_MAX = 60;
/** Longest title quoted in a meta description before the rest of the sentence crowds it out. */
const SEO_DESCRIPTION_TITLE_MAX = 80;

type GpsPostWords = {
  title: string | null | undefined;
  author: string;
  /** What the zone is called, for the zone-name slot. */
  zoneLabel: string;
  tagName?: string | null;
};

function clip(text: string, max: number): string {
  const chars = [...text.trim()];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

/**
 * What a guess post is called on the page itself (h1, photo alt): its own title, else its tag
 * and zone. Posts made before the title became mandatory have none, and the tag is the best
 * description of the photo they still carry.
 */
export function gpsPostHeadline({ title, author, zoneLabel, tagName }: GpsPostWords): string {
  const own = title?.trim();
  if (own) return own;
  if (tagName) return `${tagName} · ${zoneLabel}`;
  return `გამოიცანი ${author}-ის ფოტო-სურათის მდებარეობა`;
}

export function gpsPostSeoTitle(post: GpsPostWords): string {
  const own = post.title?.trim();
  if (own) return `${clip(own, SEO_TITLE_MAX)} | ${post.zoneLabel} | ${APP_NAME}`;
  if (post.tagName) return `${post.tagName} · ${post.zoneLabel} | ${APP_NAME}`;
  return `${gpsPostHeadline(post)} ${APP_NAME}-ზე`;
}

export function gpsPostSeoDescription(post: GpsPostWords): string {
  const own = post.title?.trim();
  const lead = own
    ? `${clip(own, SEO_DESCRIPTION_TITLE_MAX)} — `
    : post.tagName ? `${post.tagName} · ${post.zoneLabel} — ` : '';

  return `${lead}გამოიცანი ${post.author}-ის პოსტის ზუსტი მდებარეობა ${post.zoneLabel} საბზონაში, ${APP_NAME}-ზე — მონიშნე შენი პასუხი რუკაზე და შეამოწმე რამდენად ახლოს მოხვდი.`;
}
