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
  HideAndSeekResult,
  SubmitCheckInput,
} from '@/lib/hideAndSeek';
import { getCurrentUser } from '@/lib/session';
import { getUserIdByAlias } from '@/lib/users';
import type {
  ActiveHideAndSeekType,
  HideAndSeekCheckMapDataType,
  HideAndSeekCheckResultType,
  HideAndSeekGameType,
  HideAndSeekPlayerType,
} from '@/types/hide-and-seek';

/** Resolves an alias for the private-game invitee picker, so the form can reject
 *  unknown users at the moment they are typed rather than silently on submit. */
export async function resolveInviteeAliasAction(alias: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const trimmed = (alias ?? '').trim().toLowerCase();
  if (!trimmed || trimmed === user.alias.toLowerCase()) return null;

  const found = await getUserIdByAlias(trimmed);
  return found ? trimmed : null;
}

export async function createHideAndSeekAction(
  input: CreateHideAndSeekInput
): Promise<HideAndSeekResult<{ postId: number; gameId: number }>> {
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
