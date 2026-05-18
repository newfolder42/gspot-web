export type LeaderboardPeriod = 'weekly' | 'monthly' | 'total';

function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function weekKey(date: Date): string {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-M${String(month).padStart(2, '0')}`;
}

const PROJECT_START = new Date(Date.UTC(2025, 11, 1));

export function recentPeriodKeys(period: LeaderboardPeriod, count = 3): string[] {
  if (period === 'total') return ['total'];
  const keys: string[] = [];
  const now = new Date();
  const minKey = period === 'weekly' ? weekKey(PROJECT_START) : monthKey(PROJECT_START);
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    if (period === 'weekly') {
      d.setUTCDate(d.getUTCDate() - 7 * i);
      const key = weekKey(d);
      if (key < minKey) break;
      keys.push(key);
    } else {
      d.setUTCMonth(d.getUTCMonth() - i);
      const key = monthKey(d);
      if (key < minKey) break;
      keys.push(key);
    }
  }
  return keys;
}

const GEO_MONTHS = [
  'იანვ', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
];

export function periodLabel(key: string): string {
  if (key === 'total') return 'ჯამი';
  const weekMatch = key.match(/^(\d{4})-W(\d{2})$/);
  if (weekMatch) return `კვ. ${parseInt(weekMatch[2])}, ${weekMatch[1]}`;
  const monthMatch = key.match(/^(\d{4})-M(\d{2})$/);
  if (monthMatch) return `${GEO_MONTHS[parseInt(monthMatch[2]) - 1]} ${monthMatch[1]}`;
  return key;
}
