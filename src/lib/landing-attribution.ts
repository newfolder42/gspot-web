import { z } from 'zod';

export const landingSourceSchema = z.enum(['facebook', 'meta', 'reddit']);

export const META_SOURCES = new Set<LandingSource>(['facebook', 'meta']);

export type LandingSource = z.infer<typeof landingSourceSchema>;
export type LandingAttributionSearchParams = Record<string, string | string[] | undefined>;

export const storeLandingRedirectInputSchema = z.object({
  source: landingSourceSchema,
  landingPath: z.string().startsWith('/').max(2048),
  referrer: z.string().trim().max(2048).optional(),
  utmSource: z.string().trim().max(32).optional(),
  utmCampaign: z.string().trim().max(128).optional(),
});

function getFirstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim().length > 0);
  }

  return value?.trim().length ? value : undefined;
}

export function getLandingAttribution(searchParams: LandingAttributionSearchParams): {
  source: LandingSource;
  utmSource: string | null;
  utmCampaign: string | null;
} | null {
  const candidate = getFirstValue(searchParams.source) ?? getFirstValue(searchParams.utm_source);
  const parsed = landingSourceSchema.safeParse(candidate?.toLowerCase());

  if (!parsed.success) {
    return null;
  }

  return {
    source: parsed.data,
    utmSource: getFirstValue(searchParams.utm_source)?.slice(0, 32) ?? null,
    utmCampaign: getFirstValue(searchParams.utm_campaign)?.slice(0, 128) ?? null,
  };
}

export function buildLandingPath(searchParams: LandingAttributionSearchParams): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }

      continue;
    }

    if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function normalizeReferrer(rawReferrer?: string): string | null {
  if (!rawReferrer) {
    return null;
  }

  try {
    const url = new URL(rawReferrer);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}