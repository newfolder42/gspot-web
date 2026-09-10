'use client';

import { BackpackIcon } from '@/components/icons';
import { openInventory } from './inventory-overlay';

/**
 * Opens the bag over whatever is on screen, same as pressing "I". Shown on your own
 * profile; the full page at /inventory is the fallback for anyone without a keyboard.
 */
export default function InventoryButton() {
  return (
    <button
      type="button"
      onClick={openInventory}
      title="ინვენტარი (I)"
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
    >
      <BackpackIcon className="w-4 h-4" />
      ინვენტარი
    </button>
  );
}
