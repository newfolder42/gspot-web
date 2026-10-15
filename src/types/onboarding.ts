/** A zone the welcome flow offers: public, open to everyone, and not joined yet. */
export type OnboardingZone = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  profilePhotoUrl: string | null;
  bannerUrl: string | null;
};
