import Link from 'next/link';

type Props = {
  name: string;
  zoneSlug: string;
  /** Without a slug the name renders as plain text. */
  characterSlug?: string | null;
  className?: string;
};

export default function CharacterLink({ name, zoneSlug, characterSlug, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center font-semibold text-zinc-700 dark:text-zinc-300 ${className}`}>
      {characterSlug ? (
        <Link href={`/zone/${zoneSlug}/characters/${characterSlug}`} className="hover:underline">
          {name}
        </Link>
      ) : (
        name
      )}
    </span>
  );
}
