import { getLevelFromXp, XPInfo } from '@/lib/xp';

type Props = {
  xp: XPInfo;
};

export default function XPBar({ xp }: Props) {
  const maxLevel = 42;
  const progressPercentage = (xp.currentXP / xp.xpForNextLevel) * 100;
  const isMaxLevel = xp.level >= maxLevel;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {/* Level with max level tooltip */}
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 relative group/level cursor-help">
          დონე {xp.level}{isMaxLevel && ' (მაქს)'}
          <span className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover/level:opacity-100 group-hover/level:visible transition-all duration-200 z-10 pointer-events-none whitespace-nowrap">
            მაქსიმალური დონე: {maxLevel}
            <span className="absolute -bottom-1 left-3 w-2 h-2 bg-zinc-900 dark:bg-zinc-800 transform rotate-45"></span>
          </span>
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {isMaxLevel ? (
            `${xp.totalXP.toLocaleString()} გმ`
          ) : (
            `${xp.currentXP.toLocaleString()} / ${xp.xpForNextLevel.toLocaleString()} გმ`
          )}
        </span>
      </div>
      
      {/* XP bar with XP earning tooltip */}
      <div className="relative group/xp">
        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden cursor-help">
          <div 
            className="h-full bg-amber-500 rounded-full transition-[width] duration-500 ease-out shadow-sm"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>

        {/* XP Tooltip */}
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover/xp:opacity-100 group-hover/xp:visible transition-all duration-200 z-10 pointer-events-none max-w-[90vw] sm:max-w-none">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-semibold">გამოცნობა <span className="text-amber-400">+50</span></span>
            <span className="hidden sm:inline text-zinc-500">•</span>
            <span className="font-semibold">შენი პოსტი <span className="text-amber-400">+10</span></span>
            <span className="hidden sm:inline text-zinc-500">•</span>
            <span className="font-semibold">პოსტი <span className="text-amber-400">+100</span></span>
          </div>
          <div className="absolute -bottom-1 left-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-800 transform rotate-45"></div>
        </div>
      </div>
    </div>
  );
}
