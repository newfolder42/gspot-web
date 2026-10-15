/**
 * What a post attempt in a zone the user is not an active member of is answered with, on the
 * web submit form and from the mobile API alike. Only members may take part in a zone.
 */
export const NOT_A_MEMBER_POST_MESSAGE = 'ამ საბზონაში პოსტის დასამატებლად ჯერ გაწევრიანდი.';

export type ZoneBaseType = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  profile_photo_url?: string | null;
  banner_url?: string | null;
  is_member?: boolean;
  visibility: string;
  join_policy: string;
  state: string;
  upload_rules?: string;
  guess_posting_rules?: unknown;
  created_at: string;
  updated_at: string;
};

export type ZoneMemberInfo = {
  id: number;
  role: string;
  status: string;
  notifications: any;
  joined_at: string;
  last_seen_at: string | null;
  user?: ZoneMemberUserInfo | null;
};

export type ZoneMemberUserInfo = {
  id: number;
  alias: string;
  profilePhoto?: string | null;
};

export type ZoneSettingsRecord = {
  id: number;
  upload_rules?: string | null;
  guess_scoring_rules?: string | null;
};