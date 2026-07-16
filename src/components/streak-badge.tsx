import { FlameIcon } from '@/components/icons';
import type { UserStreakInfo } from '@/lib/streaks';

type Props = {
  streak: UserStreakInfo;
};

export default function StreakBadge({ streak }: Props) {
  const lit = streak.activeToday;

  return (
    <div className="relative group/streak cursor-help shrink-0">
      <div
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
          lit
            ? 'border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-400'
            : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
        }`}
      >
        <FlameIcon className="w-4 h-4" />
        <span>{streak.current}</span>
      </div>

      {/* Streak tooltip */}
      <div className="absolute bottom-full right-0 mb-2 p-2 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover/streak:opacity-100 group-hover/streak:visible transition-all duration-200 z-10 pointer-events-none whitespace-nowrap">
        <div className="font-semibold">უწყვეტობა: {streak.current} დღე</div>
        <div className="mt-1 text-zinc-400">რეკორდი: {streak.longest} დღე</div>
        <div className="mt-1 text-zinc-400">
          {lit
            ? 'დღეს უკვე აქტიური ხარ 🔥'
            : 'დაპოსტე, გამოიცანი, შეასრულე მისია ან მოიწონე სხვისი ნამუშევარი'}
        </div>
        <div className="absolute -bottom-1 right-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-800 transform rotate-45"></div>
      </div>
    </div>
  );
}
