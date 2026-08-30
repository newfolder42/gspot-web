import { Suspense } from 'react';
import SubmitTabs from "@/components/submit-tabs";
import type { SubmitTab } from "@/components/submit-tabs";
import { getAvailableZonesForPost } from "@/actions/zones";
import { getCurrentUser } from "@/lib/session";
import { getActiveHideAndSeekForUser } from "@/lib/hideAndSeek";
import { redirect } from "next/navigation";
import type { ZoneSubmitType } from "@/actions/zones";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function Page({ searchParams }: Props) {
  const [{ tab: rawTab }, currentUser] = await Promise.all([searchParams, getCurrentUser()]);
  if (!currentUser) return redirect("/auth/signin");

  const initialTab: SubmitTab = rawTab === 'hide-and-seek' ? 'hide-and-seek' : 'photo';

  const [zones, activeGame]: [ZoneSubmitType[], Awaited<ReturnType<typeof getActiveHideAndSeekForUser>>] =
    await Promise.all([
      getAvailableZonesForPost(currentUser.userId),
      getActiveHideAndSeekForUser(currentUser.userId),
    ]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <Suspense fallback={null}>
          <SubmitTabs zones={zones} initialTab={initialTab} activeGame={activeGame} />
        </Suspense>
      </div>
    </div>
  );
}
