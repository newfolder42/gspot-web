import { notFound } from 'next/navigation';
import { getZone, getZoneMember } from '@/actions/zones';
import { getZoneUploadRules } from '@/lib/zone-upload-rules';
import { getCurrentUser } from '@/lib/session';
import { getZoneSettings } from '@/lib/zones';
import { getZoneTags } from '@/lib/tags';
import ZoneSettingsEditor from '@/components/zone/zone-settings-editor';
import ZoneTagsEditor from '@/components/zone/zone-tags-editor';

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

	const [settings, tags] = await Promise.all([
		getZoneSettings(zone.id),
		getZoneTags(zone.id),
	]);

	return (
		<div className="space-y-8">
			<ZoneSettingsEditor
				zoneSlug={zoneSlug}
				initialDescription={zone.description ?? ''}
				initialUploadRules={getZoneUploadRules(settings?.upload_rules)}
			/>
			<hr className="border-zinc-200 dark:border-zinc-800" />
			<ZoneTagsEditor zoneSlug={zoneSlug} initialTags={tags} />
		</div>
	);
}
