import { getLevelColor } from '@/lib/level-color';

type Props = {
  level: number;
  className?: string;
};

export default function LevelBadge({ level, className = '' }: Props) {
  const color = getLevelColor(level);
  return (
    <span
      className={`inline-flex items-center justify-center font-bold text-xs leading-none rounded-md px-1.5 py-0.5 border ${className}`}
      style={{ color, borderColor: color + '70', backgroundColor: color + '18' }}
      title={`დონე ${level}`}
    >
      {level}
    </span>
  );
}
