import { DataGrid, inputClass, PageHeader, primaryButtonClass } from '@/components/ui';
import { ACTIVITY_LIMIT, findUser, getActivities, type ActivityRow } from '@/lib/activities';
import { formatDateTime, tbilisiToday } from '@/lib/dates';
import { accountUrl, postUrl } from '@/lib/links';

export const dynamic = 'force-dynamic';

const linkClass = 'underline underline-offset-2 hover:opacity-80';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function detailText(a: ActivityRow): string {
  const d = a.detail;
  const onComment = d.onComment ? ' (კომენტარზე)' : '';

  switch (a.kind) {
    case 'post':
      return d.status ?? '';
    case 'guess': {
      const score = `ქულა: ${d.score ?? '-'}`;
      return d.distance == null ? score : `${score} · ${d.distance} მ`;
    }
    case 'comment':
      return d.body ?? '';
    case 'vote':
      return `${(d.value ?? 0) > 0 ? '+1' : '−1'}${onComment}`;
    case 'reward':
      return `${d.rewardName ?? ''}${onComment}`;
  }
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;

  // No user filter by default; the range defaults to today in Tbilisi. A date field emptied
  // and submitted arrives as from= / to= and leaves that end open.
  const today = tbilisiToday();
  const pick = (v: string | undefined) => (v === undefined ? today : DATE_RE.test(v) ? v : null);
  const from = pick(params.from);
  const to = pick(params.to);

  const userTerm = (params.user ?? '').trim();
  const user = userTerm ? await findUser(userTerm) : null;
  const unknownUser = userTerm !== '' && user === null;
  const activities = unknownUser ? [] : await getActivities({ userId: user?.id ?? null, from, to });

  const label = 'block text-sm font-medium text-zinc-700 dark:text-zinc-200';

  return (
    <>
      <PageHeader title="ბოლო აქტივობები" count={activities.length} />

      <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
        <label className="block space-y-1">
          <span className={label}>მომხმარებელი</span>
          <input name="user" defaultValue={userTerm} placeholder="სახელი ან ID" className={`${inputClass} w-56`} />
        </label>
        <label className="block space-y-1">
          <span className={label}>თარიღიდან</span>
          <input name="from" type="date" defaultValue={from ?? ''} className={`${inputClass} w-44`} />
        </label>
        <label className="block space-y-1">
          <span className={label}>თარიღამდე</span>
          <input name="to" type="date" defaultValue={to ?? ''} className={`${inputClass} w-44`} />
        </label>
        <button type="submit" className={primaryButtonClass}>
          ძებნა
        </button>
      </form>

      {unknownUser && <p className="mb-4 text-sm text-red-600 dark:text-red-400">მომხმარებელი ვერ მოიძებნა</p>}
      {activities.length >= ACTIVITY_LIMIT && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          ნაჩვენებია უახლესი {ACTIVITY_LIMIT}. დააკონკრეტე მომხმარებლით ან თარიღით
        </p>
      )}

      <DataGrid
        rows={activities}
        rowKey={(a) => `${a.kind}-${a.at.getTime()}-${a.user_id}-${a.post_id}`}
        columns={[
          { header: 'დრო', cell: (a) => formatDateTime(a.at), className: 'whitespace-nowrap' },
          {
            header: 'მომხმარებელი',
            cell: (a) => (
              <span>
                <a href={accountUrl(a.user_alias)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  &apos;{a.user_alias}
                </a>{' '}
                <span className="text-zinc-400">#{a.user_id}</span>
              </span>
            ),
          },
          { header: 'ტიპი', cell: (a) => a.kind },
          {
            header: 'პოსტი',
            cell: (a) => (
              <div>
                <a href={postUrl(a.post_id)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  #{a.post_id}
                </a>
                {a.post_title && (
                  <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">{a.post_title}</span>
                )}
              </div>
            ),
          },
          {
            header: 'დეტალები',
            cell: (a) => <span className="max-w-md block break-words">{detailText(a)}</span>,
          },
        ]}
      />
    </>
  );
}
