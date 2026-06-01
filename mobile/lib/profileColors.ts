/** Mirrors web's getProfileColors — same hash + same palette, returns hex. */
const PROFILE_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#F59E0B', // amber-500
  '#14B8A6', // teal-500
  '#06B6D4', // cyan-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#D946EF', // fuchsia-500
  '#F43F5E', // rose-500
];

export function getProfileColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash * 31) + key.charCodeAt(i)) >>> 0;
  return PROFILE_COLORS[hash % PROFILE_COLORS.length];
}
