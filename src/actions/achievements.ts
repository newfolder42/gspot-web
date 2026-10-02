'use server';

import { getAccountAchievementsByAlias } from '@/lib/userAchievements';
import { getCurrentUser } from '@/lib/session';

export async function loadAccountAchievements(userId: number) {
  // The viewer comes from the session, never from the caller, so a server action
  // call cannot ask for someone else's hidden achievements.
  const viewer = await getCurrentUser();
  const achievements = await getAccountAchievementsByAlias(userId, viewer?.userId ?? null);
  return achievements ?? [];
}
