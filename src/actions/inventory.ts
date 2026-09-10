'use server';

import { getInventory } from '@/lib/inventory';
import type { InventoryPageType, InventoryQuery } from '@/types/item';

/** One page of the signed-in user's bag. A logged-out caller gets an empty bag. */
export async function loadInventoryAction(options: InventoryQuery): Promise<InventoryPageType> {
  return getInventory(options);
}
