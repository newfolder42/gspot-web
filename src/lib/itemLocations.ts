// Server-only, called from the post-creation path. Deliberately not a "use server"
// module — grantItemsForPost takes an explicit userId and must never be reachable from a
// client as a server action.
import { query } from '@/lib/db';
import { logerror, loginfo } from '@/lib/logger';
import { eventBus } from '@/lib/eventBus';
import { pointInRing, type Ring } from '@/lib/geo';
import { haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { grantItemToUser } from '@/lib/inventory';
import type { FoundItemType } from '@/types/item';
import type { ItemFoundEvent } from '@/types/events/item-found';

type Coordinates = { latitude: number; longitude: number };

type LocationRow = {
  id: number;
  name: string;
  shapeType: 'circle' | 'polygon';
  latitude: number | null;
  longitude: number | null;
  radiusM: number | null;
  polygon: Ring | null;
};

/**
 * Item locations whose bounding box contains the point. The bbox is indexed and the
 * table is hand-curated (tens of rows, not millions), so this is a cheap lookup that can
 * sit on the post-creation path — the exact shape test happens in JS below.
 */
async function getCandidateLocations(coordinates: Coordinates): Promise<LocationRow[]> {
  const res = await query(
    `select id, name, shape_type, latitude, longitude, radius_m, polygon
     from item_locations
     where status = 'active'
       and $1 between min_lat and max_lat
       and $2 between min_lng and max_lng
     order by id`,
    [coordinates.latitude, coordinates.longitude]
  );

  return res.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    shapeType: r.shape_type,
    latitude: r.latitude === null ? null : Number(r.latitude),
    longitude: r.longitude === null ? null : Number(r.longitude),
    radiusM: r.radius_m === null ? null : Number(r.radius_m),
    polygon: (r.polygon as Ring | null) ?? null,
  }));
}

/** Exact hit test for a candidate the bbox already accepted. */
function containsPoint(location: LocationRow, coordinates: Coordinates): boolean {
  if (location.shapeType === 'circle') {
    if (location.latitude === null || location.longitude === null || location.radiusM === null) return false;
    const distance = haversineMeters(coordinates, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
    return distance <= location.radiusM;
  }

  if (!Array.isArray(location.polygon) || location.polygon.length < 3) return false;
  return pointInRing(coordinates.longitude, coordinates.latitude, location.polygon);
}

type LootRow = {
  alias: string;
  grantMode: 'mandatory' | 'probability';
  probabilityPercent: number | null;
};

/**
 * A loot entry is in season when it has no periods at all, or when any one of them covers
 * today. Seasons follow the Tbilisi calendar, not the server's — "flowering season" means
 * the local date, wherever the app happens to run.
 *
 * An 'annual' period repeats every year and may wrap the year end (12-01 → 02-28), which
 * is why the comparison is on a month*100+day integer with a wrap branch rather than on
 * dates. A 'range' is a one-off window, both ends inclusive.
 */
const IN_SEASON_SQL = `(
  not exists (select 1 from item_location_item_periods p where p.location_item_id = li.id)
  or exists (
    select 1
    from item_location_item_periods p,
         lateral (select (now() at time zone 'Asia/Tbilisi')::date as today) d,
         lateral (select (extract(month from d.today)::int * 100 + extract(day from d.today)::int) as md) m
    where p.location_item_id = li.id
      and (
        (p.kind = 'range' and d.today between p.starts_on and p.ends_on)
        or (
          p.kind = 'annual'
          and case
                when (p.start_month * 100 + p.start_day) <= (p.end_month * 100 + p.end_day)
                  then m.md between (p.start_month * 100 + p.start_day)
                                and (p.end_month * 100 + p.end_day)
                else m.md >= (p.start_month * 100 + p.start_day)
                  or m.md <= (p.end_month * 100 + p.end_day)
              end
        )
      )
  )
)`;

async function getLootTable(locationIds: number[]): Promise<Map<number, LootRow[]>> {
  const res = await query(
    `select li.location_id, i.alias, li.grant_mode, li.probability_percent
     from item_location_items li
     join items i on i.id = li.item_id
     where li.location_id = any($1::int[]) and i.status = 'active'
       and ${IN_SEASON_SQL}
     order by li.location_id, li.sort_order, li.id`,
    [locationIds]
  );

  const byLocation = new Map<number, LootRow[]>();
  for (const r of res.rows) {
    const locationId = Number(r.location_id);
    const list = byLocation.get(locationId) ?? [];
    list.push({
      alias: r.alias,
      grantMode: r.grant_mode,
      probabilityPercent: r.probability_percent === null ? null : Number(r.probability_percent),
    });
    byLocation.set(locationId, list);
  }
  return byLocation;
}

/**
 * Which aliases this location hands out on one find: every mandatory entry, plus at most
 * one probability entry. The probability rows are rolled in their configured order and
 * the first one that hits wins — so a 100% row placed last still acts as a floor, and
 * percentages that add up past 100 simply favour the earlier rows.
 */
function rollLoot(loot: LootRow[]): string[] {
  const aliases = loot.filter((l) => l.grantMode === 'mandatory').map((l) => l.alias);

  for (const entry of loot) {
    if (entry.grantMode !== 'probability') continue;
    const chance = entry.probabilityPercent ?? 0;
    if (Math.random() * 100 < chance) {
      aliases.push(entry.alias);
      break;
    }
  }

  return aliases;
}

/**
 * Grants whatever the user found by posting at these coordinates, and announces it.
 *
 * Runs inline in the post-creation path (web action and mobile API alike) so the client
 * can show the find immediately; the `item:found` event carries the notification and the
 * achievement update over to gspot-services. Items the user already holds are silently
 * skipped — a location keeps giving to new finders forever, but never twice to the same
 * person.
 *
 * Never throws: a failure here must not fail the post.
 */
export async function grantItemsForPost({
  userId,
  userAlias,
  postId,
  coordinates,
}: {
  userId: number;
  userAlias: string;
  postId: number;
  coordinates: Coordinates | null;
}): Promise<FoundItemType[]> {
  try {
    if (
      !coordinates ||
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude)
    ) {
      return [];
    }

    const candidates = await getCandidateLocations(coordinates);
    const matched = candidates.filter((location) => containsPoint(location, coordinates));
    if (matched.length === 0) return [];

    // Out-of-season entries are filtered out here, so a location whose whole loot table is
    // out of season simply gives nothing today.
    const loot = await getLootTable(matched.map((l) => l.id));

    const found: FoundItemType[] = [];
    for (const location of matched) {
      const entries = loot.get(location.id);
      if (!entries || entries.length === 0) continue;

      for (const alias of rollLoot(entries)) {
        // null means a unique item the user already had — the location gives nothing more.
        // A stackable item always comes back, with its raised count.
        const item = await grantItemToUser(userId, alias, 'found', {
          postId,
          locationId: location.id,
          locationName: location.name,
        });
        if (!item) continue;

        found.push(item);
        await query(`update item_locations set found_count = found_count + 1 where id = $1`, [
          location.id,
        ]);

        await eventBus.publish('item', 'found', {
          userId,
          userAlias,
          postId,
          itemAlias: item.alias,
          itemName: item.name,
          itemQuality: item.quality,
          itemIconUrl: item.iconUrl,
          itemCount: item.count,
          locationId: location.id,
          locationName: location.name,
        } as ItemFoundEvent);
      }
    }

    if (found.length > 0) {
      await loginfo('items found on post', { userId, postId, aliases: found.map((i) => i.alias) });
    }

    return found;
  } catch (err) {
    await logerror('grantItemsForPost error', [err]);
    return [];
  }
}

/** The coordinates a post's photo was taken at, or null when it carries none. */
export async function getPostPhotoCoordinates(postId: number): Promise<Coordinates | null> {
  try {
    const res = await query(
      `select uc.details
       from post_content pc
       join user_content uc on uc.id = pc.content_id
       where pc.post_id = $1
       order by pc.sort
       limit 1`,
      [postId]
    );

    const latitude = Number(res.rows[0]?.details?.coordinates?.latitude);
    const longitude = Number(res.rows[0]?.details?.coordinates?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch (err) {
    await logerror('getPostPhotoCoordinates error', [err]);
    return null;
  }
}
