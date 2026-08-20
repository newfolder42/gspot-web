import ConnectionsList from '@/components/account/connections-list';
import type { Metadata } from 'next';

/**
 * Near-duplicate of every other profile's connections tab: the unique text is
 * aliases that each have their own profile page. Kept crawlable (follow) so
 * those links still pass through, but out of the index.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

type PageProps = {
  params: Promise<{ userName?: string }>;
};

export default async function AccountConnectionsPage({ params }: PageProps) {
  const { userName } = await params;

  return (
    <ConnectionsList userName={userName ?? ''} />
  );
}
