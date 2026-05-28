import { formatTimePassed, formatActionDate } from '@/lib/dates';

type TimePassedProps = {
  date: string | Date | null;
  className?: string;
};

export default function TimePassed({ date, className }: TimePassedProps) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return (
    <time
      dateTime={d.toISOString()}
      title={formatActionDate(date)}
      className={className}
    >
      {formatTimePassed(date)}
    </time>
  );
}
