"use client";

import { useEffect, useRef } from 'react';
import { storeLandingRedirect } from '@/actions/landing-attribution';

type Props = {
  source: string;
  landingPath: string;
  utmCampaign?: string | null;
};

export default function LandingRedirectCapture({ source, landingPath, utmCampaign }: Props) {
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
      utmCampaign,
    });
  }, [landingPath, source, utmCampaign]);

  return null;
}