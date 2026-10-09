"use server";

import { getCurrentUser } from '@/lib/session';
import {
  correctPostLocation,
  fileLocationDispute,
  reviewPostLocation,
  type LocationActionError,
  type LocationActionResult,
} from '@/lib/postLocationDisputes';
import type { LocationDisputeReason, PostLocationReviewAction } from '@/types/post-location';

// The web's door into the location-dispute flow. lib/postLocationDisputes takes an explicit
// user id and is deliberately not a server action itself, so these are the only entry points
// a browser can reach — each one resolves the user from the session and nothing else.

const NOT_SIGNED_IN: { ok: false; error: LocationActionError } = { ok: false, error: 'FORBIDDEN' };

export async function disputePostLocationAction(
  postId: number,
  input: { reason: LocationDisputeReason; note?: string }
): Promise<LocationActionResult<{ disputeCount: number }>> {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN;
  return fileLocationDispute(user.userId, user.alias, postId, input);
}

export async function reviewPostLocationAction(
  postId: number,
  action: PostLocationReviewAction,
  note?: string
): Promise<LocationActionResult<{ state: string }>> {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN;
  return reviewPostLocation(user.userId, user.alias, postId, action, { note });
}

export async function correctPostLocationAction(
  postId: number,
  coordinates: { latitude: number; longitude: number }
): Promise<LocationActionResult<{ rescored: number }>> {
  const user = await getCurrentUser();
  if (!user) return NOT_SIGNED_IN;
  return correctPostLocation(user.userId, user.alias, postId, coordinates);
}
