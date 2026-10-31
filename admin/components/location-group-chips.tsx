'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { removeLocationFromGroup } from '@/actions/inventory';
import { ACTIVE_STATUS_LABELS, type ActiveStatus } from '@/lib/labels';
import type { GroupRef } from '@/lib/inventory';

/**
 * The groups a location belongs to, one chip each, with a way out of every one. A location
 * in no group gets a loud marker instead: it matches posts but hands out nothing.
 */
export default function LocationGroupChips({
  locationId,
  locationName,
  groups,
}: {
  locationId: number;
  locationName: string;
  groups: GroupRef[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(group: GroupRef) {
    if (!window.confirm(`„${locationName}“ ამოვიღო ჯგუფიდან „${group.name}“?`)) return;

    startTransition(async () => {
      const result = await removeLocationFromGroup(locationId, group.id);
      setError(result.ok ? null : result.error);
    });
  }

  if (groups.length === 0) {
    return <span className="text-xs font-medium text-red-600 dark:text-red-400">ჯგუფის გარეშე</span>;
  }

  return (
    <div className="space-y-1">
      <ul className="flex flex-wrap gap-1">
        {groups.map((g) => (
          <li
            key={g.id}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs"
          >
            <Link href={`/groups?group=${g.id}`} className="underline underline-offset-2">
              {g.name}
            </Link>
            {g.status !== 'active' && (
              <span className="text-zinc-500 dark:text-zinc-400">
                · {ACTIVE_STATUS_LABELS[g.status as ActiveStatus] ?? g.status}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(g)}
              disabled={pending}
              aria-label={`ჯგუფიდან ამოღება: ${g.name}`}
              title="ჯგუფიდან ამოღება"
              className="px-1 text-zinc-500 hover:text-red-600 disabled:opacity-50"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
