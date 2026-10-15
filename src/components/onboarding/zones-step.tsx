"use client";

import { useState } from "react";
import ProfileAvatar from "@/components/common/profileAvatar";
import { joinOnboardingZoneAction } from "@/actions/onboarding";
import type { OnboardingZone } from "@/types/onboarding";

type Props = {
  zones: OnboardingZone[];
  /** Lives in the flow, so what was joined survives stepping back and forth. */
  joinedIds: Set<number>;
  onJoined: (zoneId: number) => void;
};

function ZoneRow({
  zone,
  joined,
  onJoined,
}: {
  zone: OnboardingZone;
  joined: boolean;
  onJoined: (zoneId: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function join() {
    if (loading || joined) return;
    setLoading(true);
    setError(false);

    const result = await joinOnboardingZoneAction(zone.id);
    if (result.success) onJoined(zone.id);
    else setError(true);

    setLoading(false);
  }

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <ProfileAvatar
          name={zone.slug}
          photoUrl={zone.profilePhotoUrl}
          fallbackText={zone.slug[0].toUpperCase()}
          className="h-10 w-10 shrink-0 rounded-md text-xs font-bold"
          width={40}
          height={40}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">r/{zone.slug}</p>
          {zone.description && (
            <p className="line-clamp-2 text-xs leading-4 text-zinc-600 dark:text-zinc-400">
              {zone.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={join}
          disabled={loading || joined}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            joined
              ? "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              : "border-teal-600 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
          }`}
        >
          {joined ? "✓ წევრი" : loading ? "..." : "გაწევრიანება"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">გაწევრიანება ვერ მოხერხდა</p>}
    </li>
  );
}

export default function ZonesStep({ zones, joinedIds, onJoined }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">აღმოაჩინე საბზონები</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        საბზონი ცალკე სივრცეა საერთო თემის ან ადგილის გარშემო. გაწევრიანდი შენი ინტერესის მიხედვით
      </p>

      <ul className="mt-5 grid gap-3">
        {zones.map((zone) => (
          <ZoneRow
            key={zone.id}
            zone={zone}
            joined={joinedIds.has(zone.id)}
            onJoined={onJoined}
          />
        ))}
      </ul>
    </div>
  );
}
