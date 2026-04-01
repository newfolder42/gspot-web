import { getCurrentUser } from '@/lib/session';
import { getZone, getZoneMember } from '@/actions/zones';
import { notFound } from 'next/navigation';
import ZoneShellHeader from '@/components/zone/zone-shell-header';

type Props = {
  children: React.ReactNode;
  params: Promise<{ zoneSlug: string }>;
};

export default async function UserLayout({ children, params }: Props) {
  const [{ zoneSlug }, currentUser] = await Promise.all([params, getCurrentUser()]);

  const currentUserId = currentUser?.userId ?? null;

  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();

  const member = currentUserId ? await getZoneMember(zone.id, currentUserId) : null;

  const tabs = [
    { id: 'overview', label: 'ძირითადი', href: `/zone/${zoneSlug}` },
    { id: 'members', label: 'წევრები', href: `/zone/${zoneSlug}/members` },
    { id: 'leaderboard', label: 'ლიდერბორდი', href: `/zone/${zoneSlug}/leaderboard` },
  ];

  // if (member?.role == 'owner' || member?.role == 'admin') {
  //   tabs.push({ id: 'settings', label: 'პარამეტრები', href: `/zone/${zoneSlug}/settings` });
  // }

  return (
    <div className="max-w-4xl mx-auto py-4 px-2">
      <div className="overflow-hidden">
        <ZoneShellHeader
          zone={zone}
          userId={currentUserId}
          initialStatus={member?.status ?? null}
          isPublic={zone.visibility === 'public'}
          tabs={tabs}
        />

        <main className="p-2">
          {children}
        </main>
      </div>
    </div>
  );
}
