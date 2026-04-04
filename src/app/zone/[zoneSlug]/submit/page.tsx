import Submit from "@/components/submit";
import { getAvailableZonesForPost, getZone, userIsActiveMember } from "@/actions/zones";
import { getCurrentUser } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const [{ zoneSlug }, currentUser] = await Promise.all([params, getCurrentUser()]);

  if (!currentUser) return redirect("/auth/signin");

  const zone = await getZone(zoneSlug);
  if (!zone) return notFound();

  const isActiveMember = await userIsActiveMember(zone.id, currentUser.userId);
  if (!isActiveMember) return notFound();

  const availableZones = await getAvailableZonesForPost(currentUser.userId);
  const defaultZone = availableZones.find((z) => z.slug === zoneSlug);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-3">
          <Submit
            zones={availableZones}
            initialZoneId={defaultZone?.id ?? null}
            initialZoneSlug={defaultZone?.slug ?? null}
          />
        </div>
      </div>
    </div>
  );
}
