import Link from 'next/link';
import {
  addLocationsToGroup,
  createLocationGroup,
  createLocationItem,
} from '@/actions/inventory';
import ActionForm from '@/components/action-form';
import CreateModal from '@/components/create-modal';
import ItemIcon from '@/components/item-icon';
import LootModeFields from '@/components/loot-mode-fields';
import { DataGrid, Field, inputClass, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import {
  getGroups,
  getItemOptions,
  getLocationItems,
  getLocations,
  type GroupRow,
  type LocationRow,
} from '@/lib/inventory';
import { ACTIVE_STATUS_LABELS, itemQualityColor, type ActiveStatus } from '@/lib/labels';

export const dynamic = 'force-dynamic';

function locationsCell(g: GroupRow, locations: LocationRow[]) {
  const outside = locations.filter((l) => !g.locations.some((m) => m.id === l.id));

  return (
    <div className="space-y-2">
      {g.locations.length === 0 ? (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">ლოკაციების გარეშე</span>
      ) : (
        <ul className="text-xs space-y-0.5">
          {g.locations.map((l) => (
            <li key={l.id} className={l.status === 'active' ? '' : 'text-zinc-400 line-through'}>
              {l.name}
            </li>
          ))}
        </ul>
      )}
      {outside.length > 0 && (
        <CreateModal label="ლოკაციების დამატება" title={`ლოკაციების დამატება - ${g.name}`}>
          <ActionForm action={addLocationsToGroup}>
            <input type="hidden" name="groupId" value={g.id} />
            <Field label="ლოკაციები" required hint="რამდენიმეს მისანიშნად Ctrl + დაწკაპუნება">
              <select name="locationIds" multiple required size={Math.min(outside.length, 10)} className={inputClass}>
                {outside.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} · {l.name}
                    {l.status !== 'active' ? ` (${ACTIVE_STATUS_LABELS[l.status as ActiveStatus] ?? l.status})` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </ActionForm>
        </CreateModal>
      )}
    </div>
  );
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const [groups, locations] = await Promise.all([getGroups(), getLocations()]);

  // ?group=ID narrows the loot grid to one group. An unknown id falls back to all.
  const selected = groups.find((g) => String(g.id) === group) ?? null;
  const [groupItems, itemOptions] = await Promise.all([
    getLocationItems(selected?.id ?? null),
    getItemOptions(),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="ჯგუფები" count={groups.length}>
          <CreateModal label="დამატება" title="ახალი ჯგუფი">
            <ActionForm action={createLocationGroup}>
              <Field label="სახელი" required>
                <input name="name" required maxLength={120} className={inputClass} />
              </Field>
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
          rows={groups}
          rowKey={(g) => g.id}
          rowClassName={(g) =>
            g.id === selected?.id
              ? 'bg-zinc-100 dark:bg-zinc-800'
              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
          }
          columns={[
            { header: 'ID', cell: (g) => g.id },
            { header: 'სახელი', cell: (g) => g.name },
            {
              header: 'სტატუსი',
              cell: (g) => ACTIVE_STATUS_LABELS[g.status as ActiveStatus] ?? g.status,
            },
            { header: 'ლოკაციები', cell: (g) => locationsCell(g, locations) },
            {
              header: 'ნივთები',
              cell: (g) => (
                <Link
                  href={`/groups?group=${g.id}`}
                  className="underline underline-offset-2 text-zinc-900 dark:text-zinc-100"
                >
                  {g.item_count}
                </Link>
              ),
            },
            { header: 'თარიღი', cell: (g) => formatDateTime(g.created_at), className: 'whitespace-nowrap' },
          ]}
        />
      </section>

      <section>
        <PageHeader
          title={selected ? `ჯგუფის ნივთები - ${selected.name}` : 'ჯგუფების ნივთები'}
          count={groupItems.length}
        >
          {selected && (
            <Link
              href="/groups"
              className="text-sm underline underline-offset-2 text-zinc-600 dark:text-zinc-300"
            >
              ყველა
            </Link>
          )}
          <CreateModal label="დამატება" title="ნივთის დამატება ჯგუფში">
            <ActionForm action={createLocationItem}>
              <Field label="ჯგუფი" required>
                <select
                  name="groupId"
                  required
                  defaultValue={selected?.id ?? ''}
                  className={inputClass}
                >
                  <option value="" disabled>
                    აირჩიე ჯგუფი
                  </option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
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
          rows={groupItems}
          rowKey={(li) => li.id}
          columns={[
            { header: 'ID', cell: (li) => li.id },
            { header: 'ჯგუფი', cell: (li) => li.group_name },
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
