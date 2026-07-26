import type { Metadata } from 'next';
import HeatmapMap from '@/components/heatmap-map';
import { getGlobalPostsHeatmap } from '@/lib/heatmap';
import { APP_NAME, PUBLIC_SITE_URL } from '@/types/constants';
import { heatmapGlobalMaxZoom, heatmapGridMeters } from '@/lib/map';

// the docker build has no database, so this must not be prerendered
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `რუკა | ${APP_NAME}`,
  description: `${APP_NAME} პოსტების რუკა - ყველა საჯარო საბზონის პოსტების სითბური რუკა.`,
  alternates: {
    canonical: `https://${PUBLIC_SITE_URL}/heatmap`,
  },
};

export default async function HeatmapPage() {
  const heatmap = await getGlobalPostsHeatmap();

  return (
    <div className="max-w-5xl mx-auto py-4 px-2">
      <div className="px-2 pb-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">პოსტების რუკა</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ყველა საჯარო საბზონის პოსტების რუკა.
        </p>
        <p
          className="mt-1 text-xs text-zinc-400 dark:text-zinc-500"
          title={`ერთმანეთთან ${heatmapGridMeters} მეტრში მოხვედრილი პოსტები ერთ ლოკაციად ითვლება`}
        >
          {heatmap.totalPosts} პოსტი · {heatmap.points.length} ლოკაცია ({heatmapGridMeters}მ)
        </p>
      </div>

      <HeatmapMap
        points={heatmap.points}
        maxZoom={heatmapGlobalMaxZoom}
        pointZoom={heatmapGlobalMaxZoom}
        emptyMessage="ჯერ არცერთი პოსტი არ არის კოორდინატებით."
      />
    </div>
  );
}
