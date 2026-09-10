import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import InventoryBag from '@/components/inventory/inventory-bag';
import { getInventoryForUser } from '@/lib/inventory';
import { getCurrentUser } from '@/lib/session';
import { INVENTORY_DEFAULT_PAGE_SIZE, normalizeInventoryPageSize } from '@/types/item';

export const metadata: Metadata = {
  title: 'ინვენტარი',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ page?: string; pageSize?: string; name?: string }>;
};

/**
 * The bag as a full page. The same view is reachable without leaving the current page
 * through the "I" shortcut (see components/inventory/inventory-overlay.tsx).
 */
export default async function InventoryPage({ searchParams }: Props) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (!user) redirect('/auth/signin');

  const pageSize = normalizeInventoryPageSize(params.pageSize, INVENTORY_DEFAULT_PAGE_SIZE);
  const inventory = await getInventoryForUser(user.userId, {
    page: Number(params.page) || 1,
    pageSize,
    name: params.name ?? null,
  });

  return (
    <div className="max-w-3xl mx-auto py-4 px-2">
      <InventoryBag initial={inventory} pageSize={pageSize} />
    </div>
  );
}
