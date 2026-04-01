import Submit from "@/components/submit";
import { getAvailableZonesForPost } from "@/actions/zones";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import type { ZoneSubmitType } from "@/actions/zones";

export default async function Page({ params }: { params: Promise<{ zoneSlug: string }> }) {
  const { zoneSlug } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/auth/login");

  const zones: ZoneSubmitType[] = await getAvailableZonesForPost(currentUser.userId);

  let defaultZone: ZoneSubmitType | undefined;

  if (!defaultZone && zoneSlug) {
    defaultZone = zones.find((z) => z.slug === zoneSlug);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-3">
          <Submit
            zones={zones}
            initialZoneId={defaultZone?.id ?? null}
            initialZoneSlug={defaultZone?.slug ?? null}
          />
        </div>
      </div>
    </div>
  );
}
