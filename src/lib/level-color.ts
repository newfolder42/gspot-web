export function getLevelColor(level: number): string {
  if (level >= 60) return '#F59E0B'; // amber-500
  if (level >= 42) return '#8B5CF6'; // violet-500
  if (level >= 30) return '#0EA5E9'; // sky-500
  if (level >= 15) return '#10B981'; // emerald-500
  return '#94A3B8';                  // slate-400
}
