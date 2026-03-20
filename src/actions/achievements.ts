'use server';

import { getAccountAchievementsByAlias } from '@/lib/userAchievements';

export async function loadAccountAchievements(userId: number) {
  const achievements = await getAccountAchievementsByAlias(userId);
  return achievements ?? [];
}
