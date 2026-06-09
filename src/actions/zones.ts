"use server"

import { logerror } from '@/lib/logger';
import { becomeZoneMember, getUserPostZones, getZoneById, getZone as getZoneLib, getZoneMember as getZoneMemberLib, leaveZoneMember, createZone as createZoneLib, checkZoneSlugAvailable, inviteZoneMember as inviteZoneMemberLib, acceptZoneInvite as acceptZoneInviteLib } from '@/lib/zones';
import { getZoneTags } from '@/lib/tags';
import type { ZoneBaseType, ZoneMemberInfo } from '@/types/zone';
import type { ZoneTag } from '@/types/tag';
import { getCurrentUser } from '@/lib/session';
import { getUserLevel, getUserIdByAlias } from '@/lib/users';
import { MIN_LEVEL_CREATE_ZONE } from '@/lib/permissions';
import { getZoneUploadRules } from '@/lib/zone-upload-rules';

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
  tags: ZoneTag[];
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

export async function getAvailableZonesForPost(userId: number): Promise<ZoneSubmitType[]> {
  const zones = await getUserPostZones(userId);
  const withTags = await Promise.all(
    zones.map(async (z) => ({
      ...z,
      settings: {
        upload_rules: getZoneUploadRules(z.upload_rules),
      },
      tags: await getZoneTags(z.id),
    }))
  );
  return withTags;
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

export type CreateZoneInput = {
  slug: string;
  name: string;
  description: string;
  visibility: ZoneVisibility;
  join_policy: ZoneJoinPolicy;
};

export async function createZoneAction(input: CreateZoneInput): Promise<{ success: boolean; slug?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხართ ავტორიზებული' };

    const userLevel = await getUserLevel(currentUser.userId);
    if (userLevel < MIN_LEVEL_CREATE_ZONE) {
      return { success: false, error: `საბზონის შექმნისთვის საჭიროა ${MIN_LEVEL_CREATE_ZONE} დონე` };
    }

    const slug = input.slug.trim().toLowerCase();
    if (!slug || !/^[a-z0-9_-]+$/.test(slug) || slug.length < 3 || slug.length > 30) {
      return { success: false, error: 'არასწორი slug' };
    }

    const available = await checkZoneSlugAvailable(slug);
    if (!available) {
      return { success: false, error: 'ეს slug უკვე გამოყენებულია' };
    }

    const zone = await createZoneLib({
      slug,
      name: input.name.trim(),
      description: input.description.trim() || null,
      visibility: input.visibility,
      join_policy: input.join_policy,
    });

    if (!zone) return { success: false, error: 'შეცდომა საბზონის შექმნისას' };

    await becomeZoneMember(zone.id, currentUser.userId, 'owner', 'active');

    return { success: true, slug: zone.slug };
  } catch (err) {
    await logerror('createZoneAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

export async function checkZoneSlugAction(slug: string): Promise<{ available: boolean }> {
  try {
    const normalized = slug.trim().toLowerCase();
    if (!normalized || !/^[a-z0-9_-]+$/.test(normalized) || normalized.length < 3 || normalized.length > 30) {
      return { available: false };
    }
    const available = await checkZoneSlugAvailable(normalized);
    return { available };
  } catch {
    return { available: false };
  }
}

export async function inviteZoneMemberAction(
  zoneId: number,
  targetAlias: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხართ ავტორიზებული' };

    const zone = await getZoneById(zoneId);
    if (!zone) {
      return { success: false, error: 'საბზონა არ მოიძებნა' };
    }

    const member = await getZoneMemberLib(zoneId, currentUser.userId);
    if (!member || !['owner', 'admin', 'moderator'].includes(member.role)) {
      return { success: false, error: 'უფლება არ გაქვს' };
    }

    const target = await getUserIdByAlias(targetAlias.trim().toLowerCase());
    if (!target) return { success: false, error: 'მომხმარებელი ვერ მოიძებნა' };

    const targetUserId = Number(target);

    const result = await inviteZoneMemberLib(zoneId, targetUserId);
    if (!result.success) {
      if (result.alreadyMember) return { success: false, error: 'მომხმარებელი უკვე არის წევრი ან მოწვეულია' };
      return { success: false, error: 'შეცდომა მოწვევისას' };
    }

    const { eventBus } = await import('@/lib/eventBus');
    await eventBus.publish('zone_member', 'added', {
      zoneId,
      zoneSlug: zone.slug,
      userId: targetUserId,
      userAlias: targetAlias,
      invitedBy: currentUser.userId,
      invitedByAlias: currentUser.alias,
      status: 'pending',
    });

    return { success: true };
  } catch (err) {
    await logerror('inviteZoneMemberAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

export async function acceptZoneInviteAction(zoneId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: 'არ ხართ ავტორიზებული' };

    const ok = await acceptZoneInviteLib(zoneId, currentUser.userId);
    if (!ok) return { success: false, error: 'მოწვევა ვერ მოიძებნა ან უკვე დამუშავებულია' };

    return { success: true };
  } catch (err) {
    await logerror('acceptZoneInviteAction error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}
