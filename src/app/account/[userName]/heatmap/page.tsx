import { notFound } from 'next/navigation';
import HeatmapMap from '@/components/heatmap-map';
import { getAccountByAlias } from '@/lib/account';
import { getOwnPostsHeatmap } from '@/lib/heatmap';
import { getCurrentUser } from '@/lib/session';
import { heatmapGridMeters, heatmapOwnMaxZoom } from '@/lib/map';

export default async function AccountHeatmapPage({ params }: { params: Promise<{ userName: string }> }) {
  const { userName } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) return notFound();

  const data = await getAccountByAlias(userName, currentUser.userId);
  if (!data) return notFound();

  if (!data.isOwnProfile) return notFound();

  const heatmap = await getOwnPostsHeatmap(data.user.id);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">შენი პოსტების რუკა</h2>
        <span
          className="text-xs text-zinc-500 dark:text-zinc-400"
          title={`ერთმანეთთან ${heatmapGridMeters} მეტრში მოხვედრილი პოსტები ერთ ლოკაციად ითვლება`}
        >
          {heatmap.totalPosts} პოსტი · {heatmap.points.length} ლოკაცია
          <span className="text-zinc-400 dark:text-zinc-500"> ({heatmapGridMeters}მ)</span>
        </span>
      </div>

      <HeatmapMap
        points={heatmap.points}
        maxZoom={heatmapOwnMaxZoom}
        pointZoom={heatmapOwnMaxZoom}
        emptyMessage="ჯერ არცერთი პოსტი არ გაქვს კოორდინატებით."
      />
    </div>
  );
}
