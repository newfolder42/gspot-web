import type { ReportRow } from '@/lib/reports';

/**
 * The per-row action slot of the reports grid. Empty for now — the admin only lists reports.
 * Deactivating the reported user or post, or marking the report reviewed, goes in here and
 * gets the row it belongs to.
 */
export default function ReportRowActions({ report }: { report: ReportRow }) {
  return (
    <span data-report-id={report.id} className="text-zinc-400 dark:text-zinc-600">
      -
    </span>
  );
}
