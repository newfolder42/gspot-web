import { DataGrid, inputClass, PageHeader, primaryButtonClass } from '@/components/ui';
import { testPoint } from '@/lib/location-test';
import { ACTIVE_STATUS_LABELS, type ActiveStatus } from '@/lib/labels';

const label = 'block text-sm font-medium text-zinc-700 dark:text-zinc-200';

/** Point-in-location check: X is longitude, Y is latitude, as in the stored [lng, lat] rings. */
export default async function LocationTester({ x, y }: { x: string; y: string }) {
  const lng = x.trim() === '' ? NaN : Number(x);
  const lat = y.trim() === '' ? NaN : Number(y);
  const valid = Number.isFinite(lng) && Number.isFinite(lat);
  const result = valid ? await testPoint(lng, lat) : null;
  const rows = result?.locations ?? null;

  return (
    <section>
      <PageHeader title="ტესტი" />

      <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block space-y-1">
          <span className={label}>X (გრძედი)</span>
          <input name="x" defaultValue={x} placeholder="44.8008" className={`${inputClass} w-44`} />
        </label>
        <label className="block space-y-1">
          <span className={label}>Y (განედი)</span>
          <input name="y" defaultValue={y} placeholder="41.6927" className={`${inputClass} w-44`} />
        </label>
        <button type="submit" className={primaryButtonClass}>
          შემოწმება
        </button>
      </form>

      {(x !== '' || y !== '') && !valid && (
        <p className="text-sm text-red-600 dark:text-red-400">X და Y უნდა იყოს რიცხვი</p>
      )}

      {rows && (
        <DataGrid
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { header: 'ID', cell: (r) => r.id },
            { header: 'სახელი', cell: (r) => r.name },
            { header: 'ფორმა', cell: (r) => r.shape_type },
            { header: 'სტატუსი', cell: (r) => ACTIVE_STATUS_LABELS[r.status as ActiveStatus] ?? r.status },
            { header: 'BBox', cell: (r) => (r.in_bbox ? 'კი' : 'არა') },
            {
              header: 'შიგნით',
              cell: (r) => (r.inside ? 'კი' : 'არა') + (r.distance_m !== null ? ` (${r.distance_m} მ)` : ''),
            },
            {
              header: 'შედეგი',
              cell: (r) => (
                <span className={r.counts ? 'font-semibold text-green-600' : 'text-zinc-500'}>
                  {r.counts ? 'ჩაითვლება' : r.inside ? 'გამორთულია' : 'არ ჩაითვლება'}
                </span>
              ),
            },
            {
              header: 'ჯგუფები',
              cell: (r) =>
                r.inside ? (
                  r.groups.length === 0 ? (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">ჯგუფის გარეშე</span>
                  ) : (
                    <ul className="space-y-1.5">
                      {r.groups.map((g) => {
                        const groupLive = r.counts && g.status === 'active';
                        return (
                          <li key={g.id} className="text-xs">
                            <div className={groupLive ? 'font-medium' : 'font-medium text-zinc-400 line-through'}>
                              {g.name}
                              {g.status !== 'active'
                                ? ` · ${ACTIVE_STATUS_LABELS[g.status as ActiveStatus] ?? g.status}`
                                : ''}
                            </div>
                            <ul className="space-y-0.5">
                              {g.loot.map((l) => {
                                const live = groupLive && l.in_season && l.item_status === 'active';
                                return (
                                  <li key={l.item_alias} className={live ? '' : 'text-zinc-400 line-through'}>
                                    {l.sort_order}. {l.item_name} · {l.grant_mode}
                                    {l.probability_percent !== null ? ` ${l.probability_percent}%` : ''}
                                    {!l.in_season ? ' · სეზონის გარეთ' : ''}
                                    {l.item_status !== 'active' ? ` · ${l.item_status}` : ''}
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : (
                  '-'
                ),
            },
          ]}
        />
      )}

      {result && result.items.length > 0 && (
        <div className="mt-4 space-y-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">შესაძლო ნივთები ერთ პოსტზე</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            ყველა აქტიური ჯგუფი ერთხელ ითვლება; ნივთი, რომელსაც რამდენიმე ჯგუფი გასცემს, ერთხელ ეძლევა.
          </p>
          <ul className="text-sm space-y-0.5">
            {result.items.map((i) => (
              <li key={i.item_alias}>
                {i.item_name}{' '}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {i.offers
                    .map(
                      (o) =>
                        `${o.group_name} (${o.grant_mode}${o.probability_percent !== null ? ` ${o.probability_percent}%` : ''})`
                    )
                    .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
