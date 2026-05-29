export type OwnAccountData = {
  user: {
    id: number;
    alias: string;
    email: string;
    age: number;
    created_at: string;
  };
  profilePhoto: {
    id: number;
    url: string;
  } | null;
  level: {
    xp: number;
    level: number;
  } | null;
};
