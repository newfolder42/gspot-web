import ReportRowActions from '@/components/report-row-actions';
import { DataGrid, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { accountUrl, postUrl } from '@/lib/links';
import { getReports } from '@/lib/reports';

const linkClass = 'underline underline-offset-2 hover:opacity-80';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <>
      <PageHeader title="რეპორტები" count={reports.length} />

      <DataGrid
        rows={reports}
        rowKey={(r) => r.id}
        columns={[
          { header: 'ID', cell: (r) => r.id },
          { header: 'თარიღი', cell: (r) => formatDateTime(r.created_at), className: 'whitespace-nowrap' },
          {
            header: 'მომხმარებელი',
            cell: (r) => (
              <span>
                <a href={accountUrl(r.reporter_alias)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  &apos;{r.reporter_alias}
                </a>{' '}
                <span className="text-zinc-400">#{r.reporter_user_id}</span>
              </span>
            ),
          },
          {
            header: 'ობიექტი',
            cell: (r) => (
              <div>
                <div>
                  {r.target_post_id !== null ? (
                    <a href={postUrl(r.target_post_id)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {r.target_type}
                    </a>
                  ) : r.target_type === 'user' && r.target_label ? (
                    <a href={accountUrl(r.target_label)} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {r.target_type}
                    </a>
                  ) : (
                    r.target_type
                  )}{' '}
                  <span className="text-zinc-400">#{r.target_id}</span>
                </div>
                {r.target_label && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs break-words">
                    {r.target_type === 'user' ? `'${r.target_label}` : r.target_label}
                  </div>
                )}
              </div>
            ),
          },
          { header: 'მიზეზი', cell: (r) => r.reason },
          {
            header: 'დეტალები',
            cell: (r) => <span className="max-w-sm block break-words">{r.details ?? '-'}</span>,
          },
          { header: 'სტატუსი', cell: (r) => r.status },
          { header: 'მოქმედებები', cell: (r) => <ReportRowActions report={r} /> },
        ]}
      />
    </>
  );
}
