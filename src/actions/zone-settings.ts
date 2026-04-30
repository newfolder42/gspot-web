"use server";

import { revalidatePath } from 'next/cache';
import { getZone, getZoneMember } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import { getZoneSettings, updateZoneSettings, upsertZoneContent } from '@/lib/zones';

export type SaveZoneMediaPayload = {
  contentType: 'profile-photo' | 'banner';
  publicUrl: string;
  details?: Record<string, unknown>;
};

export type SaveZoneMediaResult = {
  success: boolean;
  error?: string;
};

export async function saveZoneMediaAction(zoneSlug: string, payload: SaveZoneMediaPayload): Promise<SaveZoneMediaResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Authentication required.' };
  }

  const zone = await getZone(zoneSlug);
  if (!zone) {
    return { success: false, error: 'Zone not found.' };
  }

  const member = await getZoneMember(zone.id, currentUser.userId);
  if (!(member && (member.role === 'owner' || member.role === 'admin'))) {
    return { success: false, error: 'Not allowed.' };
  }

  if (!payload.publicUrl || !/^https?:\/\//i.test(payload.publicUrl)) {
    return { success: false, error: 'Invalid image URL.' };
  }

  const saved = await upsertZoneContent(zone.id, payload.contentType, payload.publicUrl, payload.details ?? {});
  if (!saved) {
    return { success: false, error: 'Failed to save image.' };
  }

  revalidatePath(`/zone/${zoneSlug}`);
  revalidatePath(`/zone/${zoneSlug}/settings`);

  return { success: true };
}

export type SaveZoneSettingsPayload = {
  description: string;
  uploadRules: string[];
};

export type SaveZoneSettingsResult = {
  success: boolean;
  error?: string;
};

const DEFAULT_UPLOAD_RULES = [
  'ფოტო უნდა იყოს საქართველოში გადაღებული.',
  'კოორდინატები უნდა იყოს მითითებული სადაცაა გადაღებული, და არა კადრის ობიექტის.',
  'არ უნდა იყოს დაზუმილი ან შემთხვევითი კადრი.',
];

export async function saveZoneSettingsAction(
  zoneSlug: string,
  payload: SaveZoneSettingsPayload,
): Promise<SaveZoneSettingsResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Authentication required.' };
  }

  const zone = await getZone(zoneSlug);
  if (!zone) {
    return { success: false, error: 'Zone not found.' };
  }

  const member = await getZoneMember(zone.id, currentUser.userId);
  if (!(member && (member.role === 'owner' || member.role === 'admin'))) {
    return { success: false, error: 'Not allowed.' };
  }

  const description = payload.description.trim();
  if (description.length > 1500) {
    return { success: false, error: 'Description is too long.' };
  }

  const rules = payload.uploadRules
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0)
    .slice(0, 20);

  const nextRules = rules.length > 0 ? rules : DEFAULT_UPLOAD_RULES;
  const currentSettings = await getZoneSettings(zone.id);

  const guessScoringRules = typeof currentSettings?.guess_scoring_rules === 'string'
    ? currentSettings.guess_scoring_rules
    : JSON.stringify(currentSettings?.guess_scoring_rules ?? {});

  const saved = await updateZoneSettings(zone.id, {
    description,
    join_policy: zone.join_policy,
    upload_rules: JSON.stringify(nextRules),
    guess_scoring_rules: guessScoringRules,
  });

  if (!saved) {
    return { success: false, error: 'Failed to save settings.' };
  }

  revalidatePath(`/zone/${zoneSlug}`);
  revalidatePath(`/zone/${zoneSlug}/settings`);

  return { success: true };
}
