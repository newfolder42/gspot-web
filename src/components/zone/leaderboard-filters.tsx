'use client';

import { useRouter } from 'next/navigation';
import { periodLabel } from '@/lib/period';

interface LeaderboardFiltersProps {
  weekKeys: string[];
  monthKeys: string[];
  currentPeriod: string;
}

export default function LeaderboardFilters({ weekKeys, monthKeys, currentPeriod }: LeaderboardFiltersProps) {
  const router = useRouter();

  const isWeek = weekKeys.includes(currentPeriod);
  const isMonth = monthKeys.includes(currentPeriod);
  const isTotal = currentPeriod === 'total';

  const baseClass = 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700';
  const activeClass = 'bg-teal-500 text-black';

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* Total */}
      <a
        href="?period=total"
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${isTotal ? activeClass : baseClass}`}
      >
        ჯამური
      </a>

      {/* Week dropdown */}
      <div className="relative">
        <select
          value={isWeek ? currentPeriod : ''}
          onChange={(e) => e.target.value && router.push(`?period=${e.target.value}`)}
          className={`appearance-none pl-3 pr-6 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${isWeek ? activeClass : baseClass}`}
        >
          {!isWeek && <option value="">კვირა</option>}
          {weekKeys.map((key) => (
            <option key={key} value={key}>
              {periodLabel(key)}
            </option>
          ))}
        </select>
      </div>

      {/* Month dropdown */}
      <div className="relative">
        <select
          value={isMonth ? currentPeriod : ''}
          onChange={(e) => e.target.value && router.push(`?period=${e.target.value}`)}
          className={`appearance-none pl-3 pr-6 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${isMonth ? activeClass : baseClass}`}
        >
          {!isMonth && <option value="">თვე</option>}
          {monthKeys.map((key) => (
            <option key={key} value={key}>
              {periodLabel(key)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
