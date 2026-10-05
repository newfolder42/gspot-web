import bcrypt from 'bcrypt';
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

export type ChangePasswordError = 'USER_NOT_FOUND' | 'WRONG_PASSWORD' | 'INVALID_PASSWORD' | 'SERVER_ERROR';

// Not server actions on purpose: they trust their arguments, so callers must
// resolve the user from a session/token or verify a reset code themselves.
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: true } | { success: false; error: ChangePasswordError }> {
  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return { success: false, error: 'WRONG_PASSWORD' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    return { success: true };
  } catch (err) {
    await logerror('changePassword error:', [err]);
    return { success: false, error: 'SERVER_ERROR' };
  }
}

export async function resetPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedEmail = email.toLowerCase();

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }

    const userResult = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2',
      [passwordHash, normalizedEmail]
    );

    return { success: true };
  } catch (err) {
    await logerror('resetPassword error', [err]);
    return { success: false, error: 'SERVER_ERROR' };
  }
}
