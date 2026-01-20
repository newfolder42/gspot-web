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

export function formatTimePassed(iso: string | Date | null): string {
  if (!iso) return "";
  const date = iso instanceof Date ? iso : new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ახლახანს";
  if (minutes < 60) return `${minutes}წთს წინ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}სთს წინ`;
  const days = Math.floor(hours / 24);
  return `${days}დღის წინ`;
};