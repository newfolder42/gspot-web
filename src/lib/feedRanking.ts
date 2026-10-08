// Tuning for the home feed's activity ranking (getHomeFeedPosts in posts.ts). A post's feed
// position is its creation time, pulled up to the moment of the latest engagement on it:
//   - by someone the viewer follows  -> at full value
//   - by anyone (the viewer included) -> held back by FEED_STRANGER_BUMP_DELAY_HOURS, so a
//                                       new post still outranks an old one that got a vote
// Engagement older than the window doesn't count, so an old post can't resurface forever.
// Lives outside posts.ts because that file is "use server" and may only export async functions.

export const FEED_ACTIVITY_WINDOW_DAYS = 7;
export const FEED_STRANGER_BUMP_DELAY_HOURS = 6;
