export function formatAge(days: number): string {
  if (days < 0 || isNaN(days)) return '';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remDays = days % 30;

  if (years > 0) {
    if (months > 0) {
      return `${years}წ ${months}თ`;
    }
    return `${years}წ`;
  }
  if (months > 0) {
    if (remDays > 0) {
      return `${months}თ ${remDays}დღე`;
    }
    return `${months}თ`;
  }
  return `${remDays}დღე`;
}
