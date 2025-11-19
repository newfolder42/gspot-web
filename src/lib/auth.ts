"use server";

import bcrypt from 'bcrypt';
import pool from "@/lib/db";
import AppError from './errors';
import { User, UserToRegister } from '@/types/user';

function isEmail(s: string) {
    return typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

export async function signup(user: UserToRegister) {
    const name = typeof user.name === 'string' ? user.name.trim() : '';
    const alias = typeof user.alias === 'string' ? user.alias.trim().toLowerCase() : '';
    const email = user?.email;
    const password = user?.password;

    if (!name) throw new AppError('Name is required', 'INVALID_NAME');
    if (!alias) throw new AppError('Username is required', 'INVALID_ALIAS');
    if (!/^[a-z0-9_-]+$/.test(alias) || alias.length < 3 || alias.length > 30) throw new AppError('Invalid username', 'INVALID_ALIAS');
    if (!isEmail(email)) throw new AppError('Invalid email', 'INVALID_EMAIL');
    if (typeof password !== 'string' || password.length < 6) throw new AppError('Password too short', 'INVALID_PASSWORD');

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR alias = $2', [email, alias]);
        if (existing.rows.length > 0) throw new AppError('Email or username already taken', 'USER_EXISTS');

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, alias, email, password_hash, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, alias, created_at',
            [name, alias, email, passwordHash]
        );

        return result.rows[0];
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError('Internal error', 'INTERNAL_ERROR');
    }
}

export async function login(email: string, password: string) : Promise<User> {
    if (!isEmail(email)) throw new AppError('Invalid email', 'INVALID_EMAIL');
    if (typeof password !== 'string' || password.length === 0) throw new AppError('Password required', 'INVALID_PASSWORD');

    try {
        const res = await pool.query('SELECT id, alias, name, email, password_hash, created_at FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) throw new AppError('User not found', 'USER_NOT_FOUND');

        const user = res.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS');
        const session = await createSessionRecord(user.id, new Date());
        const sessionId = session?.id ?? null;

        return { id: user.id, alias: user.alias, name: user.name, email: user.email, createdAt: user.created_at, sessionId: sessionId };
    } catch (err) {
        console.error('Login error:', err);
        if (err instanceof AppError) throw err;
        throw new AppError('Internal error', 'INTERNAL_ERROR');
    }
}

export async function createSessionRecord(userId: number | string, loginAt: Date = new Date()) {
  const res = await pool.query(
    'INSERT INTO user_sessions (user_id, login_at) VALUES ($1, $2) RETURNING id',
    [userId, loginAt]
  );
  return res.rows[0];
}

export async function endSessionById(sessionId: number | string) {
  const res = await pool.query(
    'UPDATE user_sessions SET logout_at = NOW() WHERE id = $1 AND logout_at IS NULL RETURNING id, logout_at',
    [sessionId]
  );
  return res.rows[0];
}

export async function endSessionByUserId(userId: number | string) {
  const res = await pool.query(
    'UPDATE user_sessions SET logout_at = NOW() WHERE user_id = $1 AND logout_at IS NULL RETURNING id, logout_at',
    [userId]
  );
  return res.rows[0];
}

export async function userAliasTaken(userAlias: string) {    
  const res = await pool.query(
    'SELECT 1 FROM users WHERE alias = $1',
    [userAlias]
  );
  return res.rows.count > 0;
}