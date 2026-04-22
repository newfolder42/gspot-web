import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getActiveZones } from "@/lib/zones";
import type { ZoneBaseType } from "@/types/zone";

export const metadata: Metadata = {
  title: "საბზონების დათვალიერება | G'spot",
  description: "აღმოაჩინე G'spot-ის საბზონები, იპოვე შენი წევრობის სივრცეები და გადადი ინტერესის მიხედვით ახალ ნაკადებში.",
};

const ZONE_COLORS = [
  { banner: "bg-red-100 dark:bg-red-950",     icon: "bg-red-500"     },
  { banner: "bg-orange-100 dark:bg-orange-950", icon: "bg-orange-500" },
  { banner: "bg-amber-100 dark:bg-amber-950",  icon: "bg-amber-500"   },
  { banner: "bg-teal-100 dark:bg-teal-950",    icon: "bg-teal-500"    },
  { banner: "bg-cyan-100 dark:bg-cyan-950",    icon: "bg-cyan-500"    },
  { banner: "bg-blue-100 dark:bg-blue-950",    icon: "bg-blue-500"    },
  { banner: "bg-violet-100 dark:bg-violet-950", icon: "bg-violet-500" },
  { banner: "bg-fuchsia-100 dark:bg-fuchsia-950", icon: "bg-fuchsia-500" },
  { banner: "bg-rose-100 dark:bg-rose-950",    icon: "bg-rose-500"    },
];

function zoneColors(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return ZONE_COLORS[hash % ZONE_COLORS.length];
}

function ZoneCard({ zone }: { zone: ZoneBaseType }) {
  const colors = zoneColors(zone.slug);
  const initial = zone.slug[0].toUpperCase();
  const isOpen = zone.join_policy === "open";
  const hasProfilePhoto = Boolean(zone.profile_photo_url);
  const hasBanner = Boolean(zone.banner_url);

  return (
    <article className="group flex flex-col rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      {/* banner container - relative for absolute positioning of profile photo */}
      <div className="relative">
        {/* banner */}
        <div className="relative h-24 overflow-hidden bg-zinc-100 dark:bg-zinc-800 rounded-t-2xl">
          {hasBanner ? (
            <Image
              src={zone.banner_url!}
              alt={`${zone.slug} banner`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : (
            <div className={`absolute inset-0 ${colors.banner}`} />
          )}
        </div>

        {/* profile photo overlapping banner - positioned absolutely */}
        <div className={`absolute bottom-0 left-3 translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-md border-2 border-white text-xs font-bold text-white dark:border-zinc-900 ${colors.icon}`}>
          {hasProfilePhoto ? (
            <Image
              src={zone.profile_photo_url!}
              alt={`${zone.slug} profile`}
              fill
              className="object-cover rounded-sm"
              sizes="40px"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
      </div>

      {/* card content with extra top padding for profile photo */}
      <div className="relative flex flex-1 flex-col px-3 pb-3 pt-5">

        {/* slug */}
        <Link
          href={`/zone/${zone.slug}`}
          className="truncate text-sm font-bold text-zinc-950 hover:underline dark:text-zinc-50"
        >
          r/{zone.slug}
        </Link>

        {/* description */}
        {zone.description && (
          <p className="mb-3 line-clamp-2 flex-1 text-xs leading-4 text-zinc-600 dark:text-zinc-400">
            {zone.description}
          </p>
        )}

        {/* footer */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1.5">
            {zone.is_member && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                წევრი
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${isOpen
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              }`}>
              {isOpen ? "ღია" : "დახურული"}
            </span>
          </div>

          <Link
            href={`/zone/${zone.slug}`}
            className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
          >
            გახსენი
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function ExploreZonesPage() {
  const currentUser = await getCurrentUser();
  const zones = await getActiveZones(currentUser?.userId);

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 md:px-4 md:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">აღმოაჩინე საბზონები</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          გაწევრიანდი შენი ინტერესის მიხედვით
        </p>
      </div>

      {zones.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">ახალი საბზონა არ მოიძებნა.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} />
          ))}
        </div>
      )}
    </div>
  );
}