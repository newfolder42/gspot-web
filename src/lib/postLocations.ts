// Server-only, called from the post-creation path. Deliberately not a "use server"
// module — these take an explicit userId and must never be reachable from a client as
// server actions.
import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';

export type Coordinates = { latitude: number; longitude: number };

export type SameLocationCheck = { allowed: true } | { allowed: false; message: string };

export type ProjectSettings = {
  /** How long a spot stays blocked for the user who posted there. 0 disables the rule. */
  sameLocationPostLimitMinutes: number;
  /** Half-width of the square around a previous post, in metres. 0 disables the rule. */
  sameLocationPostRangeM: number;
};

const DEFAULT_SETTINGS: ProjectSettings = {
  sameLocationPostLimitMinutes: 30,
  sameLocationPostRangeM: 50,
};

/** Metres in one degree of latitude. Longitude shrinks by cos(lat), see below. */
const METERS_PER_DEGREE = 111320;

const SETTINGS_CACHE_MS = 60_000;
let cachedSettings: { value: ProjectSettings; readAt: number } | null = null;

/**
 * The single `project_settings` row, cached for a minute so the check does not cost a
 * query of its own on every submit. An UPDATE in SQL therefore takes up to a minute to
 * take effect — that is fine for numbers that are tuned by hand.
 *
 * Falls back to the defaults if the row is missing or unreadable: the rule keeps working
 * with the values it shipped with rather than switching itself off.
 */
export async function getProjectSettings(): Promise<ProjectSettings> {
  if (cachedSettings && Date.now() - cachedSettings.readAt < SETTINGS_CACHE_MS) {
    return cachedSettings.value;
  }

  try {
    const res = await query(
      `select same_location_post_limit_minutes, same_location_post_range_m
       from project_settings
       where id = 1`
    );

    const row = res.rows[0];
    const value: ProjectSettings = row
      ? {
          sameLocationPostLimitMinutes: Number(row.same_location_post_limit_minutes),
          sameLocationPostRangeM: Number(row.same_location_post_range_m),
        }
      : DEFAULT_SETTINGS;

    cachedSettings = { value, readAt: Date.now() };
    return value;
  } catch (err) {
    await logerror('getProjectSettings error', [err]);
    return cachedSettings?.value ?? DEFAULT_SETTINGS;
  }
}

/** The message the user sees, carrying whatever the settings currently say. */
export function sameLocationBlockedMessage(rangeM: number, minutes: number): string {
  return `შეუძლებელია ერთი ლოკაციიდან ${rangeM} მეტრის რადიუსში პოსტის დადება ${minutes} წუთის განმავლობაში.`;
}

function isUsable(coordinates: Coordinates | null | undefined): coordinates is Coordinates {
  return (
    !!coordinates &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude)
  );
}

/**
 * Whether this user may publish a gps-photo post at these coordinates right now.
 *
 * The proximity test is a square, not a circle: `range_m` is converted to degrees and the
 * query asks for the user's recent rows inside that bounding box. There is no PostGIS
 * here, and a square is the shape SQL can filter on directly — at 50 m its corners reach
 * ~70 m, so the rule is a little stricter on the diagonals and identical everywhere else.
 * No haversine refinement follows on purpose: the square *is* the rule, which keeps the
 * radius a number you can change in one UPDATE without anything else moving.
 *
 * The lookup is already narrowed to one user and one short window, so it reads a handful
 * of rows at most off the (user_id, created_at desc) index.
 *
 * Fails open: a post that cannot be checked is a post that goes through. Blocking every
 * upload because the database hiccuped would be the worse failure.
 */
export async function checkSameLocationPostLimit({
  userId,
  coordinates,
}: {
  userId: number;
  coordinates: Coordinates | null;
}): Promise<SameLocationCheck> {
  try {
    if (!isUsable(coordinates)) return { allowed: true };

    const { sameLocationPostLimitMinutes, sameLocationPostRangeM } = await getProjectSettings();
    if (sameLocationPostLimitMinutes <= 0 || sameLocationPostRangeM <= 0) {
      return { allowed: true };
    }

    const latPad = sameLocationPostRangeM / METERS_PER_DEGREE;
    // A degree of longitude is METERS_PER_DEGREE * cos(lat) wide. The clamp mirrors the
    // item_locations bbox trigger and stops the pad exploding near the poles.
    const lngPad =
      sameLocationPostRangeM /
      (METERS_PER_DEGREE * Math.max(Math.cos((coordinates.latitude * Math.PI) / 180), 0.01));

    const res = await query(
      `select 1
       from user_post_locations
       where user_id = $1
         and created_at > now() - make_interval(mins => $2::int)
         and latitude between $3 and $4
         and longitude between $5 and $6
       limit 1`,
      [
        userId,
        sameLocationPostLimitMinutes,
        coordinates.latitude - latPad,
        coordinates.latitude + latPad,
        coordinates.longitude - lngPad,
        coordinates.longitude + lngPad,
      ]
    );

    if (res.rowCount === 0) return { allowed: true };

    return {
      allowed: false,
      message: sameLocationBlockedMessage(sameLocationPostRangeM, sameLocationPostLimitMinutes),
    };
  } catch (err) {
    await logerror('checkSameLocationPostLimit error', [err]);
    return { allowed: true };
  }
}

/**
 * Records where a published gps-photo post was taken, so it blocks the spot for the next
 * window. Written inline with the post rather than from a gspot-services event handler:
 * this row *is* the guard, and a user who submits twice inside the event lag would slip
 * past a check that reads a table filled asynchronously.
 *
 * Never throws — a failure here must not fail the post.
 */
export async function recordPostLocation({
  userId,
  postId,
  coordinates,
}: {
  userId: number;
  postId: number;
  coordinates: Coordinates | null;
}): Promise<void> {
  try {
    if (!isUsable(coordinates)) return;

    await query(
      `insert into user_post_locations (user_id, post_id, latitude, longitude)
       values ($1, $2, $3, $4)
       on conflict (post_id) do nothing`,
      [userId, postId, coordinates.latitude, coordinates.longitude]
    );
  } catch (err) {
    await logerror('recordPostLocation error', [err]);
  }
}

/**
 * The coordinates stored on an uploaded photo, read by content id.
 *
 * The post-creation path needs them *before* the post row exists, which is what sets this
 * apart from `getPostPhotoCoordinates` in lib/itemLocations.ts — that one starts from a
 * post that is already published.
 */
export async function getContentCoordinates(contentId: number): Promise<Coordinates | null> {
  try {
    const res = await query(`select details from user_content where id = $1`, [contentId]);

    const latitude = Number(res.rows[0]?.details?.coordinates?.latitude);
    const longitude = Number(res.rows[0]?.details?.coordinates?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch (err) {
    await logerror('getContentCoordinates error', [err]);
    return null;
  }
}
