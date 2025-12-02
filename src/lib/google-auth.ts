"use server";

import { createSessionRecord, signup } from '@/lib/auth';
import { getUserIdByEMail } from './users';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_AUTH_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_AUTH_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_AUTH_REDIRECT_URI!;

export async function getGoogleAuthUrl() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
        redirect_uri: GOOGLE_REDIRECT_URI,
        client_id: GOOGLE_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
    };
    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
}

interface GoogleTokens {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    token_type: string;
    id_token: string;
}

interface GoogleUser {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name?: string;
    picture: string;
    locale: string;
}

export async function getGoogleTokens(code: string): Promise<GoogleTokens> {
    const url = 'https://oauth2.googleapis.com/token';
    const values = {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(values),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch Google tokens');
    }

    return response.json();
}

export async function getGoogleUser(access_token: string): Promise<GoogleUser> {
    const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
        {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch Google user');
    }

    return response.json();
}

export async function handleGoogleCallback(code: string) {
    try {
        const tokens = await getGoogleTokens(code);
        const googleUser = await getGoogleUser(tokens.access_token);

        const user = await getUserIdByEMail(
            googleUser.email
        );

        let userId: number;
        let alias: string;

        if (user != null) {
            userId = user.id;
            alias = user.alias;
        } else {
            // User doesn't exist, create a new account
            // Generate a unique alias from the Google name
            const baseAlias = googleUser.given_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            let generatedAlias = baseAlias;

            const { id } = await signup({
                name: googleUser.name,
                alias: generatedAlias,
                email: googleUser.email,
                password: Math.random().toString(36).slice(-8),
            });

            userId = id;
            alias = generatedAlias;
        }

        // Create session
        const session = await createSessionRecord(userId, new Date());
        const sessionId = session?.id ?? null;

        return {
            userId,
            alias,
            sessionId,
            email: googleUser.email,
            name: googleUser.name,
        };
    } catch (error) {
        console.error('Google OAuth error:', error);
        throw new Error('Failed to authenticate with Google');
    }
}
