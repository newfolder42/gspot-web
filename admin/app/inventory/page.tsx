import ItemIcon from '@/components/item-icon';
import { DataGrid, inputClass, PageHeader, primaryButtonClass } from '@/components/ui';
import { findUser } from '@/lib/activities';
import { formatDateTime } from '@/lib/dates';
import { getUserItems, USER_ITEMS_LIMIT } from '@/lib/inventory';
import { itemQualityColor } from '@/lib/labels';
import { accountUrl } from '@/lib/links';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user: term = '' } = await searchParams;
  const userTerm = term.trim();
  const user = userTerm ? await findUser(userTerm) : null;
  const unknownUser = userTerm !== '' && user === null;
  const rows = unknownUser ? [] : await getUserItems(user?.id ?? null);

  return (
    <>
      <PageHeader title="მომხმარებლების ინვენტარი" count={rows.length} />

      <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block space-y-1">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">მომხმარებელი</span>
          <input name="user" defaultValue={userTerm} placeholder="სახელი ან ID" className={`${inputClass} w-56`} />
        </label>
        <button type="submit" className={primaryButtonClass}>
          ძებნა
        </button>
      </form>

      {unknownUser && <p className="mb-4 text-sm text-red-600 dark:text-red-400">მომხმარებელი ვერ მოიძებნა</p>}
      {rows.length >= USER_ITEMS_LIMIT && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">ნაჩვენებია უახლესი {USER_ITEMS_LIMIT}</p>
      )}

      <DataGrid
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          { header: 'დრო', cell: (r) => formatDateTime(r.created_at), className: 'whitespace-nowrap' },
          {
            header: 'მომხმარებელი',
            cell: (r) => (
              <span>
                <a
                  href={accountUrl(r.user_alias)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  &apos;{r.user_alias}
                </a>{' '}
                <span className="text-zinc-400">#{r.user_id}</span>
              </span>
            ),
          },
          {
            header: 'ნივთი',
            cell: (r) => (
              <div className="flex items-center gap-2">
                <ItemIcon url={r.item_icon_url} name={r.item_name} />
                <div>
                  <div className="font-medium" style={{ color: itemQualityColor(r.item_quality) }}>
                    {r.item_name}
                  </div>
                  <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{r.item_alias}</div>
                </div>
              </div>
            ),
          },
          { header: 'რაოდენობა', cell: (r) => r.count },
          { header: 'წყარო', cell: (r) => r.source },
          {
            header: 'დეტალები',
            cell: (r) => (
              <span className="max-w-md block break-all font-mono text-xs">
                {Object.keys(r.source_details ?? {}).length ? JSON.stringify(r.source_details) : '-'}
              </span>
            ),
          },
        ]}
      />
    </>
  );
}
