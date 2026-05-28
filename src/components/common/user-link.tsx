import Link from 'next/link';
import LevelBadge from './level-badge';

type Props = {
  alias: string;
  level?: number | null;
  className?: string;
};

export default function UserLink({ alias, level, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${className}`}>
      <Link
        href={`/account/${alias}`}
        className="text-zinc-700 dark:text-zinc-300 hover:underline"
      >
        &apos;{alias}
      </Link>
      {level != null && <LevelBadge level={level} />}
    </span>
  );
}
