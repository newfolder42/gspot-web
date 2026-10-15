import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/onboarding-flow";
import { getCurrentUser } from "@/lib/session";
import { getOnboardingZones, isOnboardingCompleted, safeNextPath } from "@/lib/onboarding";
import { APP_NAME } from "@/types/constants";

export const metadata: Metadata = {
  title: `კეთილი იყოს შენი მობრძანება | ${APP_NAME}`,
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function WelcomePage({ searchParams }: Props) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect("/auth/signin?redirect=%2Fwelcome");

  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);

  // Already through it (or an account from before the flow existed): nothing to show.
  if (await isOnboardingCompleted(user.userId)) redirect(next);

  const zones = await getOnboardingZones(user.userId);

  return <OnboardingFlow alias={user.alias} zones={zones} next={next} />;
}
