"use server";

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { logerror } from "@/lib/logger";
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
    logerror('updatePassword error:', [err]);
    return { success: false, message: "პაროლის განახლებისას მოხდა შეცდომა" };
  }
}

export async function updateEmailNotifications(enabled: boolean): Promise<{ success: boolean; message: string | null }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "არ ხარ ავტორიზებული" };
    }

    const existingResult = await query(
      'SELECT notifications FROM user_options WHERE user_id = $1',
      [user.userId]
    );

    let notifications = { email: enabled };
    if (existingResult.rows.length > 0) {
      notifications = { ...existingResult.rows[0].notifications, email: enabled };
    }

    await query(
      `INSERT INTO user_options (user_id, notifications)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET 
         notifications = $2,
         updated_at = CURRENT_TIMESTAMP`,
      [user.userId, JSON.stringify(notifications)]
    );

    return { success: true, message: null };
  } catch (err) {
    logerror('updateEmailNotifications error:', [err]);
    return { success: false, message: "პარამეტრების განახლებისას მოხდა შეცდომა" };
  }
}

export async function getNotificationSettings(): Promise<{ emailNotificationsEnabled: boolean } | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const result = await query(
      'SELECT notifications FROM user_options WHERE user_id = $1',
      [user.userId]
    );
    
    if (result.rows.length === 0) {
      return { emailNotificationsEnabled: true };
    }

    const notifications = result.rows[0].notifications;
    return {
      emailNotificationsEnabled: notifications?.email ?? true,
    };
  } catch (err) {
    logerror('getNotificationSettings error:', [err]);
    return null;
  }
}
