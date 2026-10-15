import { apiClient } from '@/lib/api';

/** Mirrors web src/types/onboarding.ts. */
export type OnboardingZone = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  profilePhotoUrl: string | null;
  bannerUrl: string | null;
};

export type OnboardingState = {
  completed: boolean;
  /** Public, open zones the user has not joined. Empty once `completed`. */
  zones: OnboardingZone[];
};

export const onboardingApi = {
  get: (): Promise<OnboardingState> =>
    apiClient.get<OnboardingState>('/onboarding').then((r) => r.data),

  complete: (): Promise<{ completed: boolean }> =>
    apiClient.post<{ completed: boolean }>('/onboarding/complete').then((r) => r.data),
};
