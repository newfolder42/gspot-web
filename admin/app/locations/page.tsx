import { addLocationsToGroup, createLocation } from '@/actions/inventory';
import ActionForm from '@/components/action-form';
import CreateModal from '@/components/create-modal';
import LocationGroupChips from '@/components/location-group-chips';
import LocationShapeFields from '@/components/location-shape-fields';
import LocationTester from '@/components/location-tester';
import { DataGrid, Field, inputClass, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { getGroups, getLocations, type GroupRow, type LocationRow } from '@/lib/inventory';
import {
  ACTIVE_STATUS_LABELS,
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

/** Groups and a location's own membership: the chips, and a button to join more groups. */
function groupsCell(l: LocationRow, groups: GroupRow[]) {
  const joinable = groups.filter((g) => !l.groups.some((m) => m.id === g.id));

  return (
    <div className="space-y-2">
      <LocationGroupChips locationId={l.id} locationName={l.name} groups={l.groups} />
      {joinable.length > 0 && (
        <CreateModal label="ჯგუფში დამატება" title={`ჯგუფში დამატება - ${l.name}`}>
          <ActionForm action={addLocationsToGroup}>
            <input type="hidden" name="locationIds" value={l.id} />
            <Field label="ჯგუფი" required>
              <select name="groupId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  აირჩიე ჯგუფი
                </option>
                {joinable.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
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

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ x?: string; y?: string }>;
}) {
  const { x = '', y = '' } = await searchParams;
  const [locations, groups] = await Promise.all([getLocations(), getGroups()]);

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

              <fieldset className="space-y-3 rounded-md border border-zinc-200 dark:border-zinc-700 p-3">
                <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">ჯგუფები</legend>
                <label className="flex items-start gap-2 text-sm text-zinc-900 dark:text-zinc-100">
                  <input type="checkbox" name="ownGroup" defaultChecked className="mt-0.5" />
                  <span>
                    საკუთარი ჯგუფის შექმნა (იგივე სახელით)
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      ლოკაციას ექნება თავისი ნივთები, რომლებსაც მხოლოდ ის გასცემს
                    </span>
                  </span>
                </label>
                {groups.length > 0 && (
                  <Field label="დამატება არსებულ ჯგუფებში" hint="რამდენიმეს მისანიშნად Ctrl + დაწკაპუნება">
                    <select name="groupIds" multiple size={Math.min(groups.length, 6)} className={inputClass}>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                          {g.status !== 'active'
                            ? ` (${ACTIVE_STATUS_LABELS[g.status as ActiveStatus] ?? g.status})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </fieldset>
            </ActionForm>
          </CreateModal>
        </PageHeader>

        <DataGrid
          rows={locations}
          rowKey={(l) => l.id}
          columns={[
            { header: 'ID', cell: (l) => l.id },
            { header: 'სახელი', cell: (l) => l.name },
            { header: 'ფორმა', cell: shapeCell },
            {
              header: 'სტატუსი',
              cell: (l) => ACTIVE_STATUS_LABELS[l.status as ActiveStatus] ?? l.status,
            },
            { header: 'ნაპოვნია', cell: (l) => l.found_count },
            { header: 'ჯგუფები', cell: (l) => groupsCell(l, groups) },
            { header: 'თარიღი', cell: (l) => formatDateTime(l.created_at), className: 'whitespace-nowrap' },
          ]}
        />
      </section>

      <LocationTester x={x} y={y} />
    </div>
  );
}
