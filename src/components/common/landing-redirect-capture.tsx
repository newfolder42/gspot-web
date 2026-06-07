"use client";

import { useEffect, useRef } from 'react';
import { storeLandingRedirect } from '@/actions/landing-attribution';
import type { LandingSource } from '@/lib/landing-attribution';

type Props = {
  source: LandingSource;
  landingPath: string;
  utmSource?: string | null;
  utmCampaign?: string | null;
};

export default function LandingRedirectCapture({ source, landingPath, utmSource, utmCampaign }: Props) {
  const hasCapturedRef = useRef(false);

  useEffect(() => {
    if (hasCapturedRef.current) {
      return;
    }

    hasCapturedRef.current = true;
    void storeLandingRedirect({
      source,
      landingPath,
      referrer: document.referrer || undefined,
      utmSource,
      utmCampaign,
    });
  }, [landingPath, source, utmSource, utmCampaign]);

  return null;
}