"use client";

import { useState, type ReactNode } from "react";
import { completeOnboardingAction } from "@/actions/onboarding";
import type { OnboardingZone } from "@/types/onboarding";
import WelcomeStep from "./welcome-step";
import ZonesStep from "./zones-step";
import ReadyStep from "./ready-step";

type Props = {
  alias: string;
  zones: OnboardingZone[];
  /** Same-site path to open once the flow is finished. */
  next: string;
};

type Step = { key: string; node: ReactNode };

export default function OnboardingFlow({ alias, zones, next }: Props) {
  const [index, setIndex] = useState(0);
  const [joinedIds, setJoinedIds] = useState<Set<number>>(() => new Set());
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // To add a page, drop a step in here. A step with nothing to show is left out rather
  // than rendered empty (no joinable zones left -> no zones step).
  const steps: Step[] = [
    { key: "welcome", node: <WelcomeStep /> },
    ...(zones.length > 0
      ? [{
          key: "zones",
          node: (
            <ZonesStep
              zones={zones}
              joinedIds={joinedIds}
              onJoined={(id) => setJoinedIds((prev) => new Set(prev).add(id))}
            />
          ),
        }]
      : []),
    { key: "ready", node: <ReadyStep alias={alias} /> },
  ];

  const isLast = index === steps.length - 1;

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    setError(null);

    const result = await completeOnboardingAction();
    if (!result.success) {
      setError("დაფიქსირდა გაურკვეველი ხარვეზი.");
      setFinishing(false);
      return;
    }

    // A full load, not a client navigation: the sidebar's zone list was rendered before
    // anything was joined, and the layout only re-renders on a fresh request.
    window.location.href = next;
  }

  return (
    <div className="mx-auto w-full max-w-lg px-2 py-6 md:py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
        {steps[index].node}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={isLast ? finish : () => setIndex(index + 1)}
            disabled={finishing}
            className="inline-flex w-full items-center justify-center rounded-md bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-teal-600 disabled:opacity-60"
          >
            {isLast ? (finishing ? "მიმდინარეობს..." : "დაწყება") : "გაგრძელება"}
          </button>

          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              disabled={finishing}
              className="text-center text-sm text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← უკან
            </button>
          )}
        </div>
      </div>

      {steps.length > 1 && (
        <div className="mt-5 flex justify-center gap-2" aria-hidden>
          {steps.map((step, i) => (
            <span
              key={step.key}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-teal-500" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
