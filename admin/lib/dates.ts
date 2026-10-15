// Everything a person reads as a day or a clock time follows Asia/Tbilisi, whatever zone the
// machine running the admin is in — the same rule the main app applies.
const TIME_ZONE = 'Asia/Tbilisi';

export function formatDateTime(value: Date | string | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('ka-GE', { timeZone: TIME_ZONE });
}

/** Today's calendar date in Tbilisi as YYYY-MM-DD, the format an <input type="date"> uses. */
export function tbilisiToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}
