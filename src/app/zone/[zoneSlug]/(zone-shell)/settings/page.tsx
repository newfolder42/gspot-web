import { notFound, redirect } from 'next/navigation';
import { getZone, getZoneMember } from '@/actions/zones';
import { getCurrentUser } from '@/lib/session';
import { getZoneSettings, updateZoneSettings } from '@/lib/zones';

export default async function ZoneSettingsPage({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;
  
  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();
  
  const user = await getCurrentUser();
  if (!user) return redirect('/');
  
  const member = await getZoneMember(zone.id, user.userId);
  if (!(member && (member.role === 'admin' || member.role === 'owner'))) {
    return redirect(`/zone/${zoneSlug}`);
  }

  const settings = await getZoneSettings(zone.id);

  return <ZoneSettingsForm zone={zone} settings={settings} zoneSlug={zoneSlug} />;
}

function ZoneSettingsForm({ zone, settings, zoneSlug }: { zone: any, settings: any, zoneSlug: string }) {
  return (
        <form className="space-y-6 max-w-2xl mx-auto mt-8" action={async (formData) => {
          'use server';
          await updateZoneSettings(zone.id, {
            description: (formData.get('description') ?? '') as string,
            join_policy: (formData.get('join_policy') ?? '') as string,
            upload_rules: (formData.get('upload_rules') ?? '') as string,
            guess_scoring_rules: (formData.get('guess_scoring_rules') ?? '') as string,
          });
          return redirect(`/zone/${zoneSlug}/settings`);
        }}>
      <h2 className="text-xl font-bold mb-4">Zone Settings</h2>

      {/* Description */}
      <div>
        <label className="block font-medium mb-1">Description</label>
        <textarea
          name="description"
          defaultValue={zone.description || ''}
          className="w-full border rounded p-2"
          rows={3}
        />
      </div>

      {/* Join Policy */}
      <div>
        <label className="block font-medium mb-1">Join Policy</label>
        <select
          name="join_policy"
          defaultValue={zone.join_policy}
          className="w-full border rounded p-2"
        >
          <option value="open">Open</option>
          <option value="invite_only">Invite Only</option>
          <option value="request">Request</option>
        </select>
      </div>

      {/* Upload Rules */}
      <div>
        <label className="block font-medium mb-1">Upload Rules</label>
        <textarea
          name="upload_rules"
          defaultValue={settings?.upload_rules || ''}
          className="w-full border rounded p-2 font-mono"
          rows={6}
        />
      </div>

      {/* Guess Scoring Rules */}
      <div>
        <label className="block font-medium mb-1">Guess Scoring Rules (JSON)</label>
        <textarea
          name="guess_scoring_rules"
          defaultValue={settings?.guess_scoring_rules ? JSON.stringify(settings.guess_scoring_rules, null, 2) : ''}
          className="w-full border rounded p-2 font-mono"
          rows={6}
        />
        <div className="text-xs text-zinc-500 mt-1">Edit as JSON. Example: {'{"ranges":[{"min":0,"max":30,"score":100}]}'}</div>
      </div>

      <button type="submit" className="btn btn-primary mt-4">Save Settings</button>
    </form>
  );
}
