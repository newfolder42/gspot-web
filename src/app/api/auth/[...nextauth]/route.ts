import NextAuth, { User, type NextAuthOptions, type Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';
import bcrypt from 'bcrypt';
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            authorize: async (credentials?: Record<string, string>): Promise<User | null> => {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await query(
                        'SELECT id, alias, name, email, password_hash FROM users WHERE email = $1',
                        [credentials.email.toLowerCase()]
                    );
                    if (res.rows.length === 0) return null;

                    const user = res.rows[0];
                    const match = await bcrypt.compare(credentials.password, user.password_hash);
                    if (!match) return null;

                    return {
                        id: String(user.id),
                        alias: user.alias,
                        name: user.name,
                        email: user.email,
                    };
                } catch (err) {
                    await logerror('NextAuth authorize error', { error: String(err) });
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt'
    },
    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: User }) {
            if (user) {
                token.id = user.id;
                token.alias = user.alias;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.alias = token.alias;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/signin'
    }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
