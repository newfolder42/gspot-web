import Link from 'next/link';
import { createLocation, createLocationItem } from '@/actions/inventory';
import ActionForm from '@/components/action-form';
import CreateModal from '@/components/create-modal';
import ItemIcon from '@/components/item-icon';
import LocationShapeFields from '@/components/location-shape-fields';
import LocationTester from '@/components/location-tester';
import LootModeFields from '@/components/loot-mode-fields';
import { DataGrid, Field, inputClass, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { getItemOptions, getLocationItems, getLocations, type LocationRow } from '@/lib/inventory';
import {
  ACTIVE_STATUS_LABELS,
  itemQualityColor,
  SHAPE_LABELS,
  type ActiveStatus,
  type ShapeType,
} from '@/lib/labels';

export const dynamic = 'force-dynamic';

function shapeCell(l: LocationRow) {
  const label = SHAPE_LABELS[l.shape_type as ShapeType] ?? l.shape_type;

  if (l.shape_type === 'circle') {
    return (
      <div>
        <div>{label}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {l.latitude}, {l.longitude} · {l.radius_m} მ
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        {label} · {l.polygon?.length ?? 0} წერტილი
      </div>
      {l.polygon && (
        <details className="text-xs">
          <summary className="cursor-pointer text-zinc-500 dark:text-zinc-400">JSON</summary>
          <pre className="mt-1 max-w-md whitespace-pre-wrap break-all font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
            {JSON.stringify(l.polygon)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; x?: string; y?: string }>;
}) {
  const { location, x = '', y = '' } = await searchParams;
  const locations = await getLocations();

  // ?location=ID narrows the second grid to one location. An unknown id falls back to all.
  const selected = locations.find((l) => String(l.id) === location) ?? null;
  const [locationItems, itemOptions] = await Promise.all([
    getLocationItems(selected?.id ?? null),
    getItemOptions(),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="ლოკაციები" count={locations.length}>
          <CreateModal label="დამატება" title="ახალი ლოკაცია">
            <ActionForm action={createLocation}>
              <Field label="სახელი" required>
                <input name="name" required maxLength={120} className={inputClass} />
              </Field>
              <LocationShapeFields />
              <Field label="სტატუსი" required>
                <select name="status" defaultValue="active" className={inputClass}>
                  {(Object.keys(ACTIVE_STATUS_LABELS) as ActiveStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {ACTIVE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </ActionForm>
          </CreateModal>
        </PageHeader>

        <DataGrid
          rows={locations}
          rowKey={(l) => l.id}
          rowClassName={(l) =>
            l.id === selected?.id
              ? 'bg-zinc-100 dark:bg-zinc-800'
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
          }
          columns={[
            { header: 'ID', cell: (l) => l.id },
            { header: 'სახელი', cell: (l) => l.name },
            { header: 'ფორმა', cell: shapeCell },
            {
              header: 'სტატუსი',
              cell: (l) => ACTIVE_STATUS_LABELS[l.status as ActiveStatus] ?? l.status,
            },
            { header: 'ნაპოვნია', cell: (l) => l.found_count },
            {
              header: 'ნივთები',
              cell: (l) => (
                <Link
                  href={`/locations?location=${l.id}`}
                  className="underline underline-offset-2 text-zinc-900 dark:text-zinc-100"
                >
                  {l.item_count}
                </Link>
              ),
            },
            { header: 'თარიღი', cell: (l) => formatDateTime(l.created_at), className: 'whitespace-nowrap' },
          ]}
        />
      </section>

      <LocationTester x={x} y={y} />

      <section>
        <PageHeader
          title={selected ? `ლოკაციის ნივთები - ${selected.name}` : 'ლოკაციების ნივთები'}
          count={locationItems.length}
        >
          {selected && (
            <Link
              href="/locations"
              className="text-sm underline underline-offset-2 text-zinc-600 dark:text-zinc-300"
            >
              ყველა
            </Link>
          )}
          <CreateModal label="დამატება" title="ნივთის დამატება ლოკაციაზე">
            <ActionForm action={createLocationItem}>
              <Field label="ლოკაცია" required>
                <select
                  name="locationId"
                  required
                  defaultValue={selected?.id ?? ''}
                  className={inputClass}
                >
                  <option value="" disabled>
                    აირჩიე ლოკაცია
                  </option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ნივთი" required>
                <select name="itemId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    აირჩიე ნივთი
                  </option>
                  {itemOptions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.alias})
                    </option>
                  ))}
                </select>
              </Field>
              <LootModeFields />
              <Field label="რიგითობა">
                <input name="sortOrder" type="number" step={1} defaultValue={10} className={inputClass} />
              </Field>
            </ActionForm>
          </CreateModal>
        </PageHeader>

        <DataGrid
          rows={locationItems}
          rowKey={(li) => li.id}
          columns={[
            { header: 'ID', cell: (li) => li.id },
            { header: 'ლოკაცია', cell: (li) => li.location_name },
            {
              header: 'ნივთი',
              cell: (li) => (
                <div className="flex items-center gap-2">
                  <ItemIcon url={li.item_icon_url} name={li.item_name} />
                  <div>
                    <div className="font-medium" style={{ color: itemQualityColor(li.item_quality) }}>
                      {li.item_name}
                    </div>
                    <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{li.item_alias}</div>
                  </div>
                </div>
              ),
            },
            {
              header: 'რეჟიმი',
              cell: (li) => li.grant_mode,
            },
            {
              header: 'ალბათობა',
              cell: (li) => (li.probability_percent === null ? '-' : `${li.probability_percent}%`),
            },
            { header: 'რიგითობა', cell: (li) => li.sort_order },
            { header: 'თარიღი', cell: (li) => formatDateTime(li.created_at), className: 'whitespace-nowrap' },
          ]}
        />
      </section>
    </div>
  );
}
