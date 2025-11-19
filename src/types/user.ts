export type User = {
    id: number;
    alias: string;
    name: string;
    email: string;
    passwordHash?: string | null;
    createdAt: Date;
    sessionId?: number | null;
}

export type UserToRegister = {
    id: number;
    alias: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}