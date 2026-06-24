import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getZone, getZoneMember } from '@/actions/zones';
import { getZoneQuestsEnabled } from '@/lib/zones';
import { getCurrentUser } from '@/lib/session';
import { getZoneQuestCharacters } from '@/lib/quests';
import NewQuestForm from '@/components/zone/new-quest-form';
import { APP_NAME } from '@/types/constants';

export const metadata: Metadata = {
  title: `ახალი მისია | ${APP_NAME}`,
};

type Props = {
  params: Promise<{ zoneSlug: string }>;
};

export default async function NewQuestPage({ params }: Props) {
  const [{ zoneSlug }, currentUser] = await Promise.all([params, getCurrentUser()]);

  if (!currentUser) return notFound();

  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();
  if (!(await getZoneQuestsEnabled(zone.id))) return notFound();

  const member = await getZoneMember(zone.id, currentUser.userId);
  if (!(member && ['owner', 'admin', 'moderator'].includes(member.role))) {
    return notFound();
  }

  const characters = await getZoneQuestCharacters(zone.id);

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">ახალი მისია</h1>
      <NewQuestForm zoneId={zone.id} zoneSlug={zoneSlug} characters={characters} />
    </div>
  );
}
