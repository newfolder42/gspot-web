/** ინვენტარი — collectible ნივთები. See migrations/…_inventory-items.js for the schema. */

export const ITEM_QUALITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type ItemQuality = (typeof ITEM_QUALITIES)[number];

/** Where a held item came from — matches `user_items.source`. */
export type ItemSource = 'found' | 'quest' | 'achievement' | 'manual';

/**
 * Quality colours, WoW's palette with one deliberate change: uncommon is a muted green
 * instead of WoW's neon #1eff00, which is unreadable as text on white and glares as a
 * border. Kept as hex rather than Tailwind classes so the same table drives the web slot
 * border, the detail sheet and the React Native bag.
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

/** A row of `item_categories` or `item_types`, as far as the client needs it. */
export type ItemTaxonomyRef = {
  alias: string;
  name: string;
};

/** A row of the `items` catalog, as shown in a tooltip or a reward tile. */
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

/** A catalog item the user actually holds. */
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
  /** case-insensitive substring of the item name */
  name?: string | null;
  page?: number;
  pageSize?: number;
};

export type InventoryPageType = {
  items: InventoryItemType[];
  page: number;
  pageSize: number;
  /** matches after the name filter, not the whole bag */
  total: number;
  totalPages: number;
  /** every item the user holds, before filters — the bag counter */
  totalOwned: number;
};

/**
 * Bag geometry. The page size is a parameter everywhere (query string on web, screen
 * state on mobile) so raising it later is a UI change, not a data one.
 */
export const INVENTORY_PAGE_SIZES = [8, 16, 24, 40] as const;
export const INVENTORY_DEFAULT_PAGE_SIZE = 16;
/** Phones show fewer, larger slots — the icons are high resolution. */
export const INVENTORY_MOBILE_PAGE_SIZE = 8;
export const INVENTORY_MAX_PAGE_SIZE = 40;

export function normalizeInventoryPageSize(value: unknown, fallback = INVENTORY_DEFAULT_PAGE_SIZE): number {
  // A missing query param arrives as null or '', both of which Number() turns into 0 —
  // hence the explicit check, or every unparameterized request would ask for one slot.
  if (value === null || value === undefined || value === '') return fallback;
  const size = Number(value);
  if (!Number.isFinite(size) || size < 1) return fallback;
  return Math.min(INVENTORY_MAX_PAGE_SIZE, Math.trunc(size));
}

/**
 * Items found by publishing a post inside an item location, echoed back to the client.
 * `count` is what the user holds after the grant, so a stacked find can say so.
 */
export type FoundItemType = ItemDefinition & { count: number };
