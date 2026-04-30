import { notFound } from 'next/navigation';
import { getZoneUploadRules, getZone, getZoneMember } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import { getZoneSettings } from '@/lib/zones';
import ZoneSettingsEditor from '@/components/zone/zone-settings-editor';

type Props = {
	params: Promise<{ zoneSlug: string }>;
};

export default async function ZoneSettingsPage({ params }: Props) {
	const [{ zoneSlug }, currentUser] = await Promise.all([params, getCurrentUser()]);

	if (!currentUser) return notFound();

	const zone = await getZone(zoneSlug);
	if (!zone) return notFound();

	const member = await getZoneMember(zone.id, currentUser.userId);
	if (!(member && (member.role === 'owner' || member.role === 'admin'))) {
		return notFound();
	}

	const settings = await getZoneSettings(zone.id);

	return (
		<ZoneSettingsEditor
			zoneSlug={zoneSlug}
			initialDescription={zone.description ?? ''}
			initialUploadRules={getZoneUploadRules(settings?.upload_rules)}
		/>
	);
}
