// Georgian display strings and the fixed value lists behind them. Copied from the main app
// (src/types/item.ts, src/types/report.ts) rather than imported — the admin is standalone.

export const ITEM_QUALITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type ItemQuality = (typeof ITEM_QUALITIES)[number];

export const ITEM_QUALITY_COLORS: Record<ItemQuality, string> = {
  common: '#9d9d9d',
  uncommon: '#2ea043',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
};

export const ITEM_QUALITY_LABELS: Record<ItemQuality, string> = {
  common: 'ჩვეულებრივი',
  uncommon: 'უჩვეულო',
  rare: 'იშვიათი',
  epic: 'ეპიკური',
  legendary: 'ლეგენდარული',
};

export function itemQualityColor(quality: string): string {
  return ITEM_QUALITY_COLORS[quality as ItemQuality] ?? ITEM_QUALITY_COLORS.common;
}

export function itemQualityLabel(quality: string): string {
  return ITEM_QUALITY_LABELS[quality as ItemQuality] ?? quality;
}

/** `items.status` and `item_locations.status` */
export const ACTIVE_STATUSES = ['active', 'disabled'] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

export const ACTIVE_STATUS_LABELS: Record<ActiveStatus, string> = {
  active: 'აქტიური',
  disabled: 'გამორთული',
};

export const SHAPE_TYPES = ['polygon', 'circle'] as const;
export type ShapeType = (typeof SHAPE_TYPES)[number];

export const SHAPE_LABELS: Record<ShapeType, string> = {
  polygon: 'მრავალკუთხედი',
  circle: 'წრე',
};

export const GRANT_MODES = ['mandatory', 'probability'] as const;
export type GrantMode = (typeof GRANT_MODES)[number];

export type ActivityKind = 'post' | 'guess' | 'comment' | 'vote' | 'reward';