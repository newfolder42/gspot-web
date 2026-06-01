import { Text } from 'react-native';

/** Matches web LevelBadge exactly: tier-coloured, format "{N}დ". */
function getLevelColor(level: number): string {
  if (level >= 42) return '#F59E0B'; // amber-500
  if (level >= 30) return '#8B5CF6'; // violet-500
  if (level >= 20) return '#0EA5E9'; // sky-500
  if (level >= 10) return '#10B981'; // emerald-500
  return '#94A3B8';                  // slate-400
}

type Props = {
  level: number;
};

export function LevelBadge({ level }: Props) {
  return (
    <Text
      className="text-xs font-bold leading-none"
      style={{ color: getLevelColor(level) }}
    >
      {level}დ
    </Text>
  );
}
