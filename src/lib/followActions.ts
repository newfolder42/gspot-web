"use server";

import { deleteConnection, createConnection, connectionExists } from '@/lib/connections';
import { getCurrentUser } from '@/lib/session';
import { getUserIdByAlias } from '@/lib/users';
import { logerror } from './logger';

export async function followUnfollow(alias: string, currentlyConnected: boolean): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.userId ?? null;
    const targetUserId = await getUserIdByAlias(alias);
    if (!currentUserId || !targetUserId) {
      return { success: false, error: 'მომხმარებელი არ მოიძებნა' };
    }
    if (currentlyConnected) {
      await deleteConnection(currentUserId, targetUserId, 'connection');
    } else {
      const exists = await connectionExists(currentUserId, targetUserId, 'connection');
      if (exists) {
        return { success: false, error: 'უკვე გამოწერილია' };
      }
      const created = await createConnection(currentUserId, targetUserId, 'connection');
      if (!created) {
        return { success: false, error: 'შეუძლებელია გამოწერა' };
      }
    }

    const elapsed = Date.now() - startTime;
    if (elapsed < 300) {
      await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
    }

    return { success: true };
  } catch (err) {
    await logerror('followUnfollow error:', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}
