import type { ReactNode } from 'react';

// Small shared pieces so every page reads the same: a header, form fields and a plain grid.
// Styling follows the main app (zinc palette, light/dark by system preference).

export const inputClass =
  'w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400';

export const primaryButtonClass =
  'px-4 py-2 rounded-md text-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50';

export const secondaryButtonClass =
  'px-4 py-2 rounded-md text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50';

export function PageHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">{count}</span>
        )}
      </h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
    </label>
  );
}

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DataGrid<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  empty = 'ჩანაწერი ვერ მოიძებნა',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  rowClassName?: (row: T) => string;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className="px-3 py-2 whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`border-t border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 ${
                  rowClassName?.(row) ?? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                {columns.map((c) => (
                  <td key={c.header} className={`px-3 py-2 align-top ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
