const PROFILE_COLORS = [
  { banner: 'bg-red-100 dark:bg-red-950', icon: 'bg-red-500' },
  { banner: 'bg-orange-100 dark:bg-orange-950', icon: 'bg-orange-500' },
  { banner: 'bg-amber-100 dark:bg-amber-950', icon: 'bg-amber-500' },
  { banner: 'bg-teal-100 dark:bg-teal-950', icon: 'bg-teal-500' },
  { banner: 'bg-cyan-100 dark:bg-cyan-950', icon: 'bg-cyan-500' },
  { banner: 'bg-blue-100 dark:bg-blue-950', icon: 'bg-blue-500' },
  { banner: 'bg-violet-100 dark:bg-violet-950', icon: 'bg-violet-500' },
  { banner: 'bg-fuchsia-100 dark:bg-fuchsia-950', icon: 'bg-fuchsia-500' },
  { banner: 'bg-rose-100 dark:bg-rose-950', icon: 'bg-rose-500' },
];

export function getProfileColors(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PROFILE_COLORS[hash % PROFILE_COLORS.length];
}
