export function getInitials(alias: string): string {
  return alias
    .split(' ')
    .map((s: string) => s[0].toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}
