/** Mirrors web src/types/item.ts (the parts the app needs). */

export const ITEM_QUALITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type ItemQuality = (typeof ITEM_QUALITIES)[number];

export type ItemSource = 'found' | 'quest' | 'achievement' | 'manual';

/**
 * Quality colours — the same hex table the web bag uses. Uncommon is a muted green rather
 * than WoW's neon #1eff00, which glares against a light slot.
 */
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
  return ITEM_QUALITY_LABELS[quality as ItemQuality] ?? ITEM_QUALITY_LABELS.common;
}

/** A row of `item_categories` or `item_types`, as far as the app needs it. */
export type ItemTaxonomyRef = {
  alias: string;
  name: string;
};

export type ItemDefinition = {
  alias: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  quality: ItemQuality;
  /**
   * The item's type, and the category that type belongs to. Both come from the same join
   * — an item has no category of its own — and both are null until the item is filed.
   */
  type: ItemTaxonomyRef | null;
  category: ItemTaxonomyRef | null;
  /**
   * Whether the same user can earn this more than once. A stackable item raises its
   * `count` on every further grant and renders that count in its slot; a non-stackable
   * one is held exactly once and never shows a number.
   */
  stackable: boolean;
};

export type InventoryItemType = ItemDefinition & {
  acquiredAt: string;
  source: ItemSource;
  /** Always 1 unless the item is stackable. Only rendered when `stackable`. */
  count: number;
};

/** Whether a slot should print a number — the count is meaningless on a unique item. */
export function showsItemCount(item: { stackable: boolean }): boolean {
  return item.stackable;
}

/**
 * The bag is always newest-first — there is no sort control, by design. Category tabs are
 * the planned way to slice it, so a second ordering would only compete with them.
 */
export type InventoryQuery = {
  page?: number;
  pageSize?: number;
  /** case-insensitive substring of the item name */
  name?: string | null;
};

export type InventoryPageType = {
  items: InventoryItemType[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalOwned: number;
};

/**
 * Phones show 8 large slots per page (2 columns × 4 rows) — the icons are high
 * resolution and a denser grid would waste them. Kept as a constant so a future
 * "bag size" setting only changes what is passed to the query.
 */
export const INVENTORY_PAGE_SIZE = 8;

/**
 * Items found by publishing a post inside an item location. `count` is what the user
 * holds after the grant, so a stacked find can say so.
 */
export type FoundItemType = ItemDefinition & { count: number };
