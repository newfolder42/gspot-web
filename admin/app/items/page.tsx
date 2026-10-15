import { createItem } from '@/actions/inventory';
import ActionForm from '@/components/action-form';
import CreateModal from '@/components/create-modal';
import ItemIcon from '@/components/item-icon';
import { DataGrid, Field, inputClass, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { getItems, getTypes, type TypeRow } from '@/lib/inventory';
import {
  ACTIVE_STATUS_LABELS,
  ITEM_QUALITIES,
  ITEM_QUALITY_LABELS,
  itemQualityColor,
  itemQualityLabel,
  type ActiveStatus,
} from '@/lib/labels';

export const dynamic = 'force-dynamic';

// An item's category is reached through its type, so the picker lists types grouped by category.
function groupByCategory(types: TypeRow[]): [string, TypeRow[]][] {
  const groups = new Map<string, TypeRow[]>();
  for (const t of types) {
    groups.set(t.category_name, [...(groups.get(t.category_name) ?? []), t]);
  }
  return [...groups.entries()];
}

export default async function ItemsPage() {
  const [items, types] = await Promise.all([getItems(), getTypes()]);

  return (
    <>
      <PageHeader title="ნივთები" count={items.length}>
        <CreateModal label="დამატება" title="ახალი ნივთი">
          <ActionForm action={createItem}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Alias" required>
                <input name="alias" required maxLength={50} placeholder="church-candle" className={inputClass} />
              </Field>
              <Field label="სახელი" required>
                <input name="name" required maxLength={100} className={inputClass} />
              </Field>
            </div>

            <Field label="აღწერა">
              <textarea name="description" rows={2} maxLength={1000} className={inputClass} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="ხარისხი" required>
                <select name="quality" defaultValue="common" className={inputClass}>
                  {ITEM_QUALITIES.map((q) => (
                    <option key={q} value={q}>
                      {ITEM_QUALITY_LABELS[q]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ტიპი">
                <select name="typeId" defaultValue="" className={inputClass}>
                  <option value="">-</option>
                  {groupByCategory(types).map(([category, group]) => (
                    <optgroup key={category} label={category}>
                      {group.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
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
              <Field label="რიგითობა">
                <input name="sortOrder" type="number" step={1} defaultValue={10} className={inputClass} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input name="stackable" type="checkbox" />
              დაგროვებადი
            </label>

            <Field label="სურათი">
              <input
                name="icon"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className={inputClass}
              />
            </Field>
          </ActionForm>
        </CreateModal>
      </PageHeader>

      <DataGrid
        rows={items}
        rowKey={(i) => i.id}
        columns={[
          { header: 'ID', cell: (i) => i.id },
          { header: 'სურათი', cell: (i) => <ItemIcon url={i.icon_url} name={i.name} /> },
          { header: 'Alias', cell: (i) => <span className="font-mono text-xs">{i.alias}</span> },
          {
            header: 'სახელი',
            cell: (i) => (
              <div>
                <span className="font-medium" style={{ color: itemQualityColor(i.quality) }}>
                  {i.name}
                </span>
                {i.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">{i.description}</p>
                )}
              </div>
            ),
          },
          { header: 'ხარისხი', cell: (i) => itemQualityLabel(i.quality) },
          { header: 'ტიპი', cell: (i) => i.type_name ?? '-' },
          { header: 'კატეგორია', cell: (i) => i.category_name ?? '-' },
          { header: 'დაგროვებადი', cell: (i) => (i.stackable ? 'კი' : 'არა') },
          {
            header: 'სტატუსი',
            cell: (i) => ACTIVE_STATUS_LABELS[i.status as ActiveStatus] ?? i.status,
          },
          { header: 'რიგითობა', cell: (i) => i.sort_order },
          { header: 'თარიღი', cell: (i) => formatDateTime(i.created_at), className: 'whitespace-nowrap' },
        ]}
      />
    </>
  );
}
