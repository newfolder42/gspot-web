"use server";

import { getCurrentUser } from '@/lib/session';
import { checkSameLocationPostLimit } from '@/lib/postLocations';

export type PostLocationCheckResult = {
  allowed: boolean;
  /** The sentence to show when `allowed` is false. */
  message?: string;
};

/**
 * Whether the current user may post at these coordinates, asked before the upload starts.
 *
 * This is a courtesy check, not the guard: it exists so the user is told "no" before
 * sitting through a 15 MB upload, and it can be stale by the time the post is created.
 * `createPost` runs the same check again, and that one is authoritative.
 */
export async function checkPostLocationAllowed(coordinates: {
  latitude: number;
  longitude: number;
}): Promise<PostLocationCheckResult> {
  const user = await getCurrentUser();
  if (!user) return { allowed: true };

  const limit = await checkSameLocationPostLimit({ userId: user.userId, coordinates });
  return limit.allowed ? { allowed: true } : { allowed: false, message: limit.message };
}
