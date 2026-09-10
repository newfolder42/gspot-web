import Image from 'next/image';
import { BackpackIcon } from '@/components/icons';

/**
 * An item's artwork. Falls back to the bag glyph so a slot never renders empty just
 * because the catalog row has no icon yet.
 */
export default function ItemIcon({
  iconUrl,
  name,
  className = 'w-10 h-10',
  size = 64,
}: {
  iconUrl: string | null;
  name: string;
  className?: string;
  size?: number;
}) {
  if (!iconUrl) {
    return <BackpackIcon className={`${className} text-zinc-400 dark:text-zinc-600`} />;
  }

  return (
    <Image
      src={iconUrl}
      alt={name}
      width={size}
      height={size}
      className={`${className} object-contain`}
      unoptimized
    />
  );
}
