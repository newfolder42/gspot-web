"use server";

import { revalidatePath } from 'next/cache';
import { getZone, getZoneMember } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import { getZoneTags, createZoneTag, deleteZoneTag, isZoneTagInUse } from '@/lib/tags';
import type { ZoneTag } from '@/types/tag';

export type CreateZoneTagPayload = {
  name: string;
  color: string;
};

export type CreateZoneTagResult = {
  success: boolean;
  tag?: ZoneTag;
  error?: string;
};

export async function createZoneTagAction(
  zoneSlug: string,
  payload: CreateZoneTagPayload,
): Promise<CreateZoneTagResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: 'ავტორიზაცია სავალდებულოა.' };

  const zone = await getZone(zoneSlug);
  if (!zone) return { success: false, error: 'საბზონა არ მოიძებნა.' };

  const member = await getZoneMember(zone.id, currentUser.userId);
  if (!(member && (member.role === 'owner' || member.role === 'admin'))) {
    return { success: false, error: 'არაა დაშვებული.' };
  }

  const name = payload.name.trim();
  if (!name || name.length > 60) return { success: false, error: 'არავალიდური სახელი.' };
  if (!/^#[0-9a-fA-F]{6}$/.test(payload.color)) {
    return { success: false, error: 'არავალიდური ფერი.' };
  }

  const existing = await getZoneTags(zone.id);
  if (existing.length >= 30) return { success: false, error: 'მაქსიმუმ 30 თეგი.' };

  const tag = await createZoneTag(zone.id, name, payload.color, existing.length);
  if (!tag) return { success: false, error: 'ასეთი სახელით უვკე არსებობს.' };

  revalidatePath(`/zone/${zoneSlug}`);
  revalidatePath(`/zone/${zoneSlug}/settings`);

  return { success: true, tag };
}

export type DeleteZoneTagResult = { success: boolean; error?: string };

export async function deleteZoneTagAction(
  zoneSlug: string,
  tagId: number,
): Promise<DeleteZoneTagResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: 'ავტორიზაცია სავალდებულოა.' };

  const zone = await getZone(zoneSlug);
  if (!zone) return { success: false, error: 'საბზონა არ მოიძებნა.' };

  const member = await getZoneMember(zone.id, currentUser.userId);
  if (!(member && (member.role === 'owner' || member.role === 'admin'))) {
    return { success: false, error: 'არაა დაშვეული.' };
  }

  const inUse = await isZoneTagInUse(tagId);
  if (inUse) return { success: false, error: 'თეგი გამოყენებულია და ვერ წაიშლება.' };

  const deleted = await deleteZoneTag(tagId, zone.id);
  if (!deleted) return { success: false, error: 'თეგი არ მოიძებნა.' };

  revalidatePath(`/zone/${zoneSlug}`);
  revalidatePath(`/zone/${zoneSlug}/settings`);

  return { success: true };
}
