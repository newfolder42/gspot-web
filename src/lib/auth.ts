"use server";

import bcrypt from 'bcrypt';
import { query } from "@/lib/db";
import AppError from './errors';
import { UserToRegister } from '@/types/user';
import { logerror } from './logger';

function isEmail(s: string) {
    return typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

export async function signup(user: UserToRegister) {
    const name = typeof user.name === 'string' ? user.name.trim() : '';
    const alias = typeof user.alias === 'string' ? user.alias.trim().toLowerCase() : '';
    const email = user.email;
    const password = user.password;

    if (!name) throw new AppError('Name is required', 'INVALID_NAME');
    if (!alias) throw new AppError('Username is required', 'INVALID_ALIAS');
    if (!/^[a-z0-9_-]+$/.test(alias) || alias.length < 3 || alias.length > 30) throw new AppError('Invalid username', 'INVALID_ALIAS');
    if (!isEmail(email)) throw new AppError('Invalid email', 'INVALID_EMAIL');
    if (typeof password !== 'string' || password.length < 6) throw new AppError('Password too short', 'INVALID_PASSWORD');

    try {
        const existing = await query('SELECT id FROM users WHERE email = $1 OR alias = $2', [email, alias]);
        if (existing.rows.length > 0) throw new AppError('Email or username already taken', 'USER_EXISTS');

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await query(
            'INSERT INTO users (name, alias, email, password_hash, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, alias, created_at',
            [name, alias, email, passwordHash]
        );

        return result.rows[0];
    } catch (err) {
        logerror('signup error:' + err);
        if (err instanceof AppError) throw err;
        throw new AppError('Internal error', 'INTERNAL_ERROR');
    }
}

export async function userAliasTaken(userAlias: string) {
    try {
        const res = await query(
            'SELECT COUNT(1) as count FROM users WHERE alias = $1',
            [userAlias]
        );
        return res.rows[0].count > 0;
    } catch (err) {
        logerror('alias check:' + err);
        return true;
    }
}