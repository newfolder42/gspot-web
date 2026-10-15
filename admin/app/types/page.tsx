import { createType } from '@/actions/inventory';
import ActionForm from '@/components/action-form';
import CreateModal from '@/components/create-modal';
import { DataGrid, Field, inputClass, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { getCategories, getTypes } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export default async function TypesPage() {
  const [types, categories] = await Promise.all([getTypes(), getCategories()]);

  return (
    <>
      <PageHeader title="ტიპები" count={types.length}>
        <CreateModal label="დამატება" title="ახალი ტიპი">
          <ActionForm action={createType}>
            <Field label="Alias" required>
              <input name="alias" required maxLength={50} placeholder="head-wear" className={inputClass} />
            </Field>
            <Field label="სახელი" required>
              <input name="name" required maxLength={100} placeholder="თავსაბურავი" className={inputClass} />
            </Field>
            <Field label="კატეგორია" required>
              <select name="categoryId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  აირჩიე კატეგორია
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </ActionForm>
        </CreateModal>
      </PageHeader>

      <DataGrid
        rows={types}
        rowKey={(t) => t.id}
        columns={[
          { header: 'ID', cell: (t) => t.id },
          { header: 'Alias', cell: (t) => <span className="font-mono text-xs">{t.alias}</span> },
          { header: 'სახელი', cell: (t) => t.name },
          { header: 'კატეგორია', cell: (t) => t.category_name },
          { header: 'ნივთები', cell: (t) => t.item_count },
          { header: 'თარიღი', cell: (t) => formatDateTime(t.created_at), className: 'whitespace-nowrap' },
        ]}
      />
    </>
  );
}
