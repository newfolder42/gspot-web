import { createCategory } from '@/actions/inventory';
import ActionForm from '@/components/action-form';
import CreateModal from '@/components/create-modal';
import { DataGrid, Field, inputClass, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { getCategories } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <PageHeader title="კატეგორიები" count={categories.length}>
        <CreateModal label="დამატება" title="ახალი კატეგორია">
          <ActionForm action={createCategory}>
            <Field label="Alias" required>
              <input name="alias" required maxLength={50} placeholder="cloth" className={inputClass} />
            </Field>
            <Field label="სახელი" required>
              <input name="name" required maxLength={100} placeholder="სამოსი" className={inputClass} />
            </Field>
            <Field label="რიგითობა">
              <input name="sortOrder" type="number" step={1} defaultValue={10} className={inputClass} />
            </Field>
          </ActionForm>
        </CreateModal>
      </PageHeader>

      <DataGrid
        rows={categories}
        rowKey={(c) => c.id}
        columns={[
          { header: 'ID', cell: (c) => c.id },
          { header: 'Alias', cell: (c) => <span className="font-mono text-xs">{c.alias}</span> },
          { header: 'სახელი', cell: (c) => c.name },
          { header: 'რიგითობა', cell: (c) => c.sort_order },
          { header: 'ტიპები', cell: (c) => c.type_count },
          { header: 'თარიღი', cell: (c) => formatDateTime(c.created_at), className: 'whitespace-nowrap' },
        ]}
      />
    </>
  );
}
