"use server"

import { getCurrentUser } from '@/lib/session';
import { completeOnboarding, isOnboardingCompleted, joinOnboardingZone } from '@/lib/onboarding';
import { logerror } from '@/lib/logger';

/**
 * Whether the signed-in user still has the welcome flow ahead of them.
 * The sign-in form asks right after authenticating, to decide where to send them.
 */
export async function needsOnboardingAction(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return !(await isOnboardingCompleted(user.userId));
}

export async function joinOnboardingZoneAction(zoneId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'არ ხარ ავტორიზებული' };

    if (!Number.isSafeInteger(zoneId) || zoneId <= 0) {
      return { success: false, error: 'საბზონა არ მოიძებნა' };
    }

    return await joinOnboardingZone(user.userId, zoneId);
  } catch (err) {
    await logerror('joinOnboardingZoneAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

export async function completeOnboardingAction(): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    return { success: await completeOnboarding(user.userId) };
  } catch (err) {
    await logerror('completeOnboardingAction error', [err]);
    return { success: false };
  }
}
