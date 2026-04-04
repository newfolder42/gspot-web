import { logerror } from '@/lib/logger';
import { becomeZoneMember, getUserPostZones, getZoneById, getZone as getZoneLib, getZoneMember as getZoneMemberLib, leaveZoneMember } from '@/lib/zones';
import type { ZoneBaseType, ZoneMemberInfo } from '@/types/zone';

export type ZoneStatus = 'active' | 'archived' | 'disabled';
export type ZoneVisibility = 'public' | 'private';
export type ZoneJoinPolicy = 'open' | 'invite_only' | 'request';
export type ZoneMemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type ZoneMemberStatus = 'active' | 'left' | 'banned' | 'pending';

export type ZoneType = Omit<ZoneBaseType, 'visibility' | 'join_policy' | 'state'> & {
  visibility: ZoneVisibility;
  join_policy: ZoneJoinPolicy;
  state: ZoneStatus;
  settings?: ZoneSettinsType | null;
};

export type ZoneSubmitType = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  visibility: string;
  join_policy: string;
  state: string;
  created_at: string;
  updated_at: string;
  settings: ZoneSettinsType;
};

export type ZoneMemberType = Omit<ZoneMemberInfo, 'role' | 'status'> & {
  role: ZoneMemberRole;
  status: ZoneMemberStatus;
};
export type ZoneSettinsType = {
  upload_rules: string[] | null;
};

export type ZoneTypeRecord = ZoneBaseType;
export type ZoneMemberTypeRecord = ZoneMemberInfo;

export const DEFAULT_ZONE_UPLOAD_RULES = [
  'ფოტო უნდა იყოს საქართველოში გადაღებული.',
  'კოორდინატები უნდა იყოს მითითებული სადაცაა გადაღებული, და არა კადრის ობიექტის.',
  'არ უნდა იყოს დაზუმილი ან შემთხვევითი კადრი.',
];

export function getZoneUploadRules(uploadRules: unknown): string[] {
  if (!uploadRules) return DEFAULT_ZONE_UPLOAD_RULES;

  let parsed = uploadRules;
  if (typeof uploadRules === 'string') {
    try {
      parsed = JSON.parse(uploadRules);
    } catch {
      return DEFAULT_ZONE_UPLOAD_RULES;
    }
  }

  if (Array.isArray(parsed)) {
    const normalized = parsed.filter((r) => typeof r === 'string' && r.trim().length > 0);
    return normalized.length > 0 ? normalized : DEFAULT_ZONE_UPLOAD_RULES;
  }

  if (parsed && typeof parsed === 'object') {
    const rulesValue = (parsed as { rules?: unknown }).rules;
    if (Array.isArray(rulesValue)) {
      const normalized = rulesValue.filter((r) => typeof r === 'string' && r.trim().length > 0);
      return normalized.length > 0 ? normalized : DEFAULT_ZONE_UPLOAD_RULES;
    }
  }

  return DEFAULT_ZONE_UPLOAD_RULES;
}

export async function getAvailableZonesForPost(userId: number): Promise<ZoneSubmitType[]> {
  const zones = await getUserPostZones(userId);
  return zones.map((z) => ({
    ...z,
    settings: {
      upload_rules: getZoneUploadRules(z.upload_rules),
    },
  }));
}

export async function getZone(slug: string): Promise<ZoneType | null> {
  const zone = await getZoneLib(slug);
  if (!zone) return null;
  return {
    ...zone,
    visibility: zone.visibility as ZoneVisibility,
    join_policy: zone.join_policy as ZoneJoinPolicy,
    state: zone.state as ZoneStatus,
  };
}

export async function userIsActiveMember(zoneId: number, userId: number): Promise<boolean> {
  const member = await getZoneMemberLib(zoneId, userId);
  if (member && member.status === 'active') return true;
  return false;
}

export async function getZoneMember(zoneId: number, userId: number): Promise<ZoneMemberType | null> {
  const member = await getZoneMemberLib(zoneId, userId);
  if (!member) return null;
  return {
    ...member,
    role: member.role as ZoneMemberRole,
    status: member.status as ZoneMemberStatus,
  };
}

export async function zoneMemberRequest(zoneId: number, userId: number): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    const zone = await getZoneById(zoneId);
    if (!zone) {
      return { success: false, error: 'საბზონა არ მოიძებნა' };
    }

    const member = await getZoneMemberLib(zone.id, userId);
    if (member && (member.status == 'active' || member.status == 'pending')) {
      return { success: false, error: 'უკვე არის საბზონის წევრი' };
    }

    await becomeZoneMember(zone.id, userId, 'member', zone.join_policy === 'open' ? 'active' : 'pending');

    const elapsed = Date.now() - startTime;
    if (elapsed < 300) {
      await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
    }

    return { success: true };
  } catch (err) {
    await logerror('zoneMemberRequest error:', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}


export async function zoneMemberLeave(zoneId: number, userId: number): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  try {
    const zone = await getZoneById(zoneId);
    if (!zone) {
      return { success: false, error: 'საბზონა არ მოიძებნა' };
    }

    const member = await getZoneMemberLib(zone.id, userId);
    if (!member) {
      return { success: false, error: 'მომხმარებელი არაა საბზონის წევრი' };
    }

    if (member.role === 'owner') {
      return { success: false, error: 'მფლობელი ვერ დატოვებს საბზონას' };
    }

    await leaveZoneMember(zone.id, userId);

    const elapsed = Date.now() - startTime;
    if (elapsed < 300) {
      await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
    }

    return { success: true };
  } catch (err) {
    await logerror('zoneMemberLeave error:', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}
