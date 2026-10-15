"use server";

import {
  createHideAndSeekGame,
  endHideAndSeekGame,
  getActiveHideAndSeek,
  getHideAndSeekCheckMap,
  getHideAndSeekGame,
  getHideAndSeekPlayers,
  joinHideAndSeekGame,
  submitHideAndSeekCheck,
} from '@/lib/hideAndSeek';
import type {
  CreateHideAndSeekInput,
  CreatedHideAndSeekGame,
  HideAndSeekResult,
  SubmitCheckInput,
} from '@/lib/hideAndSeek';
import { getCurrentUser } from '@/lib/session';
import { getUserIdByAlias } from '@/lib/users';
import { getZoneMember } from '@/lib/zones';
import type {
  ActiveHideAndSeekType,
  HideAndSeekCheckMapDataType,
  HideAndSeekCheckResultType,
  HideAndSeekGameType,
  HideAndSeekPlayerType,
} from '@/types/hide-and-seek';

export type ResolveInviteeResult =
  | { ok: true; alias: string }
  | { ok: false; reason: 'not_found' | 'not_member' };

/** Resolves an alias for the private-game invitee picker, so the form can reject
 *  unknown users — and, given the game's zone, users who are not its members and so could
 *  see the game but never play it — at the moment they are typed rather than silently on submit. */
export async function resolveInviteeAliasAction(
  alias: string,
  zoneId?: number | null
): Promise<ResolveInviteeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: 'not_found' };

  const trimmed = (alias ?? '').trim().toLowerCase();
  if (!trimmed || trimmed === user.alias.toLowerCase()) return { ok: false, reason: 'not_found' };

  const found = await getUserIdByAlias(trimmed);
  if (!found) return { ok: false, reason: 'not_found' };

  if (zoneId) {
    const member = await getZoneMember(zoneId, Number(found));
    if (member?.status !== 'active') return { ok: false, reason: 'not_member' };
  }

  return { ok: true, alias: trimmed };
}

export async function createHideAndSeekAction(
  input: CreateHideAndSeekInput
): Promise<HideAndSeekResult<CreatedHideAndSeekGame>> {
  return createHideAndSeekGame(input);
}

export async function joinHideAndSeekAction(
  postId: number
): Promise<HideAndSeekResult<{ playerId: number; commentId: number }>> {
  return joinHideAndSeekGame(postId);
}

export async function submitHideAndSeekCheckAction(
  input: SubmitCheckInput
): Promise<HideAndSeekResult<HideAndSeekCheckResultType>> {
  return submitHideAndSeekCheck(input);
}

export async function endHideAndSeekAction(
  postId: number
): Promise<HideAndSeekResult<{ gameId: number }>> {
  return endHideAndSeekGame(postId);
}

export async function loadActiveHideAndSeekAction(): Promise<ActiveHideAndSeekType | null> {
  return getActiveHideAndSeek();
}

export async function loadHideAndSeekGameAction(postId: number): Promise<HideAndSeekGameType | null> {
  return getHideAndSeekGame(postId);
}

export async function loadHideAndSeekPlayersAction(postId: number): Promise<HideAndSeekPlayerType[]> {
  return getHideAndSeekPlayers(postId);
}

/** Host-only, finished games only — null covers both refusals. */
export async function loadHideAndSeekCheckMapAction(
  postId: number
): Promise<HideAndSeekCheckMapDataType | null> {
  return getHideAndSeekCheckMap(postId);
}
