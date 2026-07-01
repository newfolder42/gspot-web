"use server";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { logerror } from "@/lib/logger";
import {
  getNotificationSettings as getNotificationSettingsByUserId,
  setEmailNotifications as setEmailNotificationsByUserId,
} from "@/lib/settings";
import bcrypt from 'bcrypt';

export async function updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "არ ხარ ავტორიზებული" };
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [user.userId]);
    if (result.rows.length === 0) {
      return { success: false, message: "მომხმარებელი ვერ მოიძებნა" };
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return { success: false, message: "არასწორი პაროლი" };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო" };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.userId]);

    return { success: true, message: "პაროლი წარმატებით შეიცვალა" };
  } catch (err) {
    await logerror('updatePassword error:', [err]);
    return { success: false, message: "პაროლის განახლებისას მოხდა შეცდომა" };
  }
}

export async function updateEmailNotifications(enabled: boolean): Promise<{ success: boolean; message: string | null }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "არ ხარ ავტორიზებული" };
  }

  const ok = await setEmailNotificationsByUserId(user.userId, enabled);
  if (!ok) {
    return { success: false, message: "პარამეტრების განახლებისას მოხდა შეცდომა" };
  }

  return { success: true, message: null };
}

export async function getNotificationSettings(): Promise<{ emailNotificationsEnabled: boolean } | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return getNotificationSettingsByUserId(user.userId);
}
