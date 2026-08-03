/** Mirrors web src/types/user.ts NewUser. */
export type NewUser = {
  id: number;
  alias: string;
  createdAt: string;
  profilePhoto?: { url?: string | null } | null;
};
