import { query } from '@/lib/db';

export async function getUserIdByAlias(userName: string) {
  try {
    if (!userName) return null;
    const res = await query('SELECT id FROM users WHERE alias = $1', [userName]);
    return res.rows.length > 0 ? res.rows[0].id : null;
  } catch (err) {
    console.error('getUserIdByAlias error', err);
    return null;
  }
}

export async function getUserIdByEMail(email: string) {
  try {
    if (!email) return null;
    const res = await query('SELECT id, alias, email FROM users WHERE email = $1', [email]);
    return res.rows.length > 0 ? res.rows[0] : null;
  } catch (err) {
    console.error('getUserIdByAlias error', err);
    return null;
  }
}