"use server";

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LoggedinUser } from '@/types/LoggedinUser';

export async function getCurrentUser(): Promise<LoggedinUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  return {
    userId: Number(session.user.id),
    alias: session.user.alias,
    email: session.user.email,
  };
}