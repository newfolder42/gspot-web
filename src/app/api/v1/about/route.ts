import { NextResponse } from 'next/server';
import { aboutFeatures, aboutRoadmap, aboutTechnologies } from '@/lib/about';
import { changelog } from '@/lib/changelog';
import { APP_NAME } from '@/types/constants';

// GET /api/v1/about — static About content (features, roadmap, tech, changelog).
// Deliberately unauthenticated: it is the same content the public web page shows,
// and the mobile About screen is reachable before sign-in.
export async function GET() {
  return NextResponse.json({
    appName: APP_NAME,
    features: aboutFeatures,
    roadmap: aboutRoadmap,
    technologies: aboutTechnologies,
    changelog,
  });
}
