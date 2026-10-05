"use server";

import { getCurrentUser } from "@/lib/session";
import {
  getNotificationSettings as getNotificationSettingsByUserId,
  setEmailNotifications as setEmailNotificationsByUserId,
} from "@/lib/settings";
import { changePassword } from "@/lib/password";

export async function updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "არ ხარ ავტორიზებული" };
  }

  const result = await changePassword(user.userId, currentPassword, newPassword);
  if (result.success) {
    return { success: true, message: "პაროლი წარმატებით შეიცვალა" };
  }

  const messages: Record<typeof result.error, string> = {
    USER_NOT_FOUND: "მომხმარებელი ვერ მოიძებნა",
    WRONG_PASSWORD: "არასწორი პაროლი",
    INVALID_PASSWORD: "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო",
    SERVER_ERROR: "პაროლის განახლებისას მოხდა შეცდომა",
  };
  return { success: false, message: messages[result.error] };
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
