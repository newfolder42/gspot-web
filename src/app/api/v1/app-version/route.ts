import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/mobile-jwt';
import { query } from '@/lib/db';

const PLATFORMS = ['android', 'ios'] as const;
type Platform = (typeof PLATFORMS)[number];

/** Trims anything the client sends to something safe to store. */
function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : null;
}

/** Returns < 0, 0 or > 0. Non-numeric suffixes ("0.2.0-beta.1") are ignored. */
function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v.split('.').map((p) => Number.parseInt(p, 10) || 0);
  const left = parts(a);
  const right = parts(b);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Version check the app calls on start. Unauthenticated on purpose — it also has
 * to answer on the login screen — but a bearer token, when present, links the
 * check-in to the user.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const raw = body as Record<string, unknown> | null;
  const platform = str(raw?.platform, 16)?.toLowerCase();
  const appVersion = str(raw?.appVersion, 32);

  if (!platform || !PLATFORMS.includes(platform as Platform)) {
    return NextResponse.json({ error: 'INVALID_PLATFORM' }, { status: 400 });
  }
  if (!appVersion) {
    return NextResponse.json({ error: 'MISSING_APP_VERSION' }, { status: 400 });
  }

  const deviceKey = str(raw?.deviceKey, 64);
  const osVersion = str(raw?.osVersion, 32);
  const deviceModel = str(raw?.deviceModel, 64);

  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const userId = token ? (await verifyAccessToken(token))?.userId ?? null : null;

  // Recording the check-in must never block the answer the app is waiting for.
  if (deviceKey) {
    try {
      await query(
        `INSERT INTO mobile_version_checks
           (device_key, user_id, platform, app_version, os_version, device_model)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (device_key) DO UPDATE SET
           user_id = COALESCE($2, mobile_version_checks.user_id),
           platform = $3,
           app_version = $4,
           os_version = $5,
           device_model = $6,
           check_count = mobile_version_checks.check_count + 1,
           last_seen_at = NOW()`,
        [deviceKey, userId, platform, appVersion, osVersion, deviceModel]
      );
    } catch {
      // Non-fatal: telemetry loss is not worth failing the update check over.
    }
  }

  const { rows } = await query(
    `SELECT latest_version, min_supported_version, notes
     FROM mobile_app_versions
     WHERE platform = $1`,
    [platform]
  );

  const row = rows[0];
  if (!row) {
    // No release recorded for this platform — treat the app as up to date.
    return NextResponse.json({
      latestVersion: appVersion,
      updateAvailable: false,
      updateRequired: false,
      notes: null,
    });
  }

  const latestVersion = row.latest_version as string;
  const minSupported = row.min_supported_version as string | null;

  return NextResponse.json({
    latestVersion,
    updateAvailable: compareVersions(appVersion, latestVersion) < 0,
    updateRequired: minSupported
      ? compareVersions(appVersion, minSupported) < 0
      : false,
    notes: (row.notes as string | null) ?? null,
  });
}
