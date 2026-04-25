export type UserToRegister = {
  alias: string;
  name: string;
  email: string;
  password: string;
}

export type NewUser = {
  id: number;
  alias: string;
  createdAt: string;
  profilePhoto?: { url?: string | null } | null;
}