type Props = {
  level: number;
  className?: string;
};

function getLevelTierClass(level: number): string {
  if (level >= 42) return 'text-amber-500';
  if (level >= 30) return 'text-violet-500';
  if (level >= 20) return 'text-sky-500';
  if (level >= 10) return 'text-emerald-500';
  return 'text-slate-400';
}

export default function LevelBadge({ level, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center font-bold leading-none ${getLevelTierClass(level)} ${className}`}
      title={`დონე ${level}`}
    >
      {level}დ
    </span>
  );
}
