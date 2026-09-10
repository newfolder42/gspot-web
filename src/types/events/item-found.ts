import type { ItemQuality } from '@/types/item';

/**
 * Published once per item after the row is already in `user_items` — the grant itself is
 * synchronous so the poster sees the find immediately. gspot-services turns this into the
 * "შენს ინვენტარში მატებაა" notification and bumps the items_collected achievement.
 */
export interface ItemFoundEvent {
  userId: number;
  userAlias: string;
  postId: number;
  itemAlias: string;
  itemName: string;
  itemQuality: ItemQuality;
  itemIconUrl: string | null;
  /** How many the user holds after this grant — above 1 only for a stackable item. */
  itemCount: number;
  locationId: number;
  locationName: string;
}
