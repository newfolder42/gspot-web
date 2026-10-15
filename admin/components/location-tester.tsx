import { DataGrid, inputClass, PageHeader, primaryButtonClass } from '@/components/ui';
import { testPoint } from '@/lib/location-test';
import { ACTIVE_STATUS_LABELS, type ActiveStatus } from '@/lib/labels';

const label = 'block text-sm font-medium text-zinc-700 dark:text-zinc-200';

/** Point-in-location check: X is longitude, Y is latitude, as in the stored [lng, lat] rings. */
export default async function LocationTester({ x, y }: { x: string; y: string }) {
  const lng = x.trim() === '' ? NaN : Number(x);
  const lat = y.trim() === '' ? NaN : Number(y);
  const valid = Number.isFinite(lng) && Number.isFinite(lat);
  const rows = valid ? await testPoint(lng, lat) : null;

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
              header: 'ნივთები',
              cell: (r) =>
                r.inside ? (
                  <ul className="text-xs space-y-0.5">
                    {r.loot.map((l) => {
                      const live = l.in_season && l.item_status === 'active';
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
                ) : (
                  '-'
                ),
            },
          ]}
        />
      )}
    </section>
  );
}
