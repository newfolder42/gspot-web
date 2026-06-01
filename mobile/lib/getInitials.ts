/** Mirrors web getInitials: first char of each word, max 2. */
export function getInitials(alias: string): string {
  return alias
    .split(' ')
    .map((s) => s[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}
