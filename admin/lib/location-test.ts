import { query } from '@/lib/db';

// Mirrors the main app's item-location check (src/lib/itemLocations.ts): the indexed bounding
// box narrows the candidates, then an exact test (haversine for a circle, ray casting for a
// polygon) decides. Production only considers active locations; all are reported here, with
// the reason one does not count.

type Ring = [number, number][];

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export type LootTestRow = {
  item_alias: string;
  item_name: string;
  grant_mode: string;
  probability_percent: number | null;
  sort_order: number;
  item_status: string;
  in_season: boolean;
};

export type LocationTestRow = {
  id: number;
  name: string;
  shape_type: string;
  status: string;
  in_bbox: boolean;
  inside: boolean;
  /** circle only: distance from its centre in metres */
  distance_m: number | null;
  /** inside and active: production would grant from this location */
  counts: boolean;
  loot: LootTestRow[];
};

type DbLocation = {
  id: number;
  name: string;
  shape_type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  radius_m: number | null;
  polygon: Ring | null;
  in_bbox: boolean;
};

// Same season rule as production: no periods = always, otherwise any period covering today
// (Tbilisi calendar); annual ones may wrap the year end.
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
                  then m.md between (p.start_month * 100 + p.start_day) and (p.end_month * 100 + p.end_day)
                else m.md >= (p.start_month * 100 + p.start_day) or m.md <= (p.end_month * 100 + p.end_day)
              end
        )
      )
  )
)`;

export async function testPoint(lng: number, lat: number): Promise<LocationTestRow[]> {
  const locations = await query<DbLocation>(
    `select id, name, shape_type, status, latitude, longitude, radius_m, polygon,
            ($1::float8 between min_lat and max_lat and $2::float8 between min_lng and max_lng) as in_bbox
     from item_locations
     order by id`,
    [lat, lng]
  );

  const rows: LocationTestRow[] = locations.rows.map((l) => {
    let inside = false;
    let distance: number | null = null;

    if (l.in_bbox) {
      if (l.shape_type === 'circle' && l.latitude !== null && l.longitude !== null && l.radius_m !== null) {
        distance = haversineMeters(lat, lng, l.latitude, l.longitude);
        inside = distance <= l.radius_m;
      } else if (Array.isArray(l.polygon) && l.polygon.length >= 3) {
        inside = pointInRing(lng, lat, l.polygon);
      }
    }

    return {
      id: l.id,
      name: l.name,
      shape_type: l.shape_type,
      status: l.status,
      in_bbox: l.in_bbox,
      inside,
      distance_m: distance,
      counts: inside && l.status === 'active',
      loot: [],
    };
  });

  const hits = rows.filter((r) => r.inside).map((r) => r.id);
  if (hits.length > 0) {
    const loot = await query<LootTestRow & { location_id: number }>(
      `select li.location_id, i.alias as item_alias, i.name as item_name, li.grant_mode,
              li.probability_percent, li.sort_order, i.status as item_status,
              ${IN_SEASON_SQL} as in_season
       from item_location_items li
       join items i on i.id = li.item_id
       where li.location_id = any($1::int[])
       order by li.location_id, li.sort_order, li.id`,
      [hits]
    );
    for (const row of rows) row.loot = loot.rows.filter((x) => x.location_id === row.id);
  }

  return rows;
}
