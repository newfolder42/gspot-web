import { z } from 'zod';

export const landingSourceSchema = z.enum(['facebook', 'reddit']);

export type LandingSource = z.infer<typeof landingSourceSchema>;
export type LandingAttributionSearchParams = Record<string, string | string[] | undefined>;

export const storeLandingRedirectInputSchema = z.object({
  source: landingSourceSchema,
  landingPath: z.string().startsWith('/').max(2048),
  referrer: z.string().trim().max(2048).optional(),
});

function getFirstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim().length > 0);
  }

  return value?.trim().length ? value : undefined;
}

export function getLandingSource(searchParams: LandingAttributionSearchParams): LandingSource | null {
  const candidate = getFirstValue(searchParams.source) ?? getFirstValue(searchParams.utm_source);
  const parsed = landingSourceSchema.safeParse(candidate?.toLowerCase());

  return parsed.success ? parsed.data : null;
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