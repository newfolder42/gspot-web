import Image from 'next/image';

export default function RewardIcon({ iconUrl, name, className = 'w-4 h-4' }: { iconUrl: string | null; name: string; className?: string }) {
  if (!iconUrl) return null;
  return <Image src={iconUrl} alt={name} width={20} height={20} className={className} unoptimized />;
}
