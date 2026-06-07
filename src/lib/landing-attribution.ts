export type LandingAttributionSearchParams = Record<string, string | string[] | undefined>;

function getFirstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim().length > 0);
  }

  return value?.trim().length ? value : undefined;
}


export function getLandingAttribution(searchParams: LandingAttributionSearchParams): {
  source: string;
  utmCampaign: string | null;
} | null {
  const rawSource = getFirstValue(searchParams.utm_source)?.toLowerCase();

  if (!rawSource) {
    return null;
  }

  return {
    source: rawSource,
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