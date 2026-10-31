import { query } from '@/lib/db';

// Mirrors the main app's item-location check (src/lib/itemLocations.ts): the indexed bounding
// box narrows the candidates, then an exact test (haversine for a circle, ray casting for a
// polygon) decides. Production only considers active locations; all are reported here, with
// the reason one does not count. The loot belongs to groups: every active group a counting
// location is in is rolled, and an item offered by several of them is still granted once.

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

export type GroupTestRow = {
  id: number;
  name: string;
  status: string;
  loot: LootTestRow[];
};

/** One item a find here can win, and every group that offers it. */
export type EffectiveItem = {
  item_alias: string;
  item_name: string;
  offers: { group_name: string; grant_mode: string; probability_percent: number | null }[];
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
  groups: GroupTestRow[];
};

export type PointTestResult = {
  locations: LocationTestRow[];
  /** what production could grant here: live loot of active groups of counting locations */
  items: EffectiveItem[];
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

export async function testPoint(lng: number, lat: number): Promise<PointTestResult> {
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
      groups: [],
    };
  });

  const hits = rows.filter((r) => r.inside).map((r) => r.id);
  if (hits.length === 0) return { locations: rows, items: [] };

  const members = await query<{ location_id: number; id: number; name: string; status: string }>(
    `select m.location_id, g.id, g.name, g.status
     from item_location_group_members m
     join item_location_groups g on g.id = m.group_id
     where m.location_id = any($1::int[])
     order by g.id`,
    [hits]
  );
  const groupIds = [...new Set(members.rows.map((m) => m.id))];

  const loot = groupIds.length
    ? await query<LootTestRow & { group_id: number }>(
        `select li.group_id, i.alias as item_alias, i.name as item_name, li.grant_mode,
                li.probability_percent, li.sort_order, i.status as item_status,
                ${IN_SEASON_SQL} as in_season
         from item_location_items li
         join items i on i.id = li.item_id
         where li.group_id = any($1::int[])
         order by li.group_id, li.sort_order, li.id`,
        [groupIds]
      )
    : { rows: [] };

  for (const row of rows) {
    row.groups = members.rows
      .filter((m) => m.location_id === row.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        loot: loot.rows.filter((x) => x.group_id === m.id),
      }));
  }

  // What production would roll: each active group of a counting location once, live loot only.
  const rolled = new Map<number, GroupTestRow>();
  for (const row of rows) {
    if (!row.counts) continue;
    for (const g of row.groups) if (g.status === 'active') rolled.set(g.id, g);
  }

  const items = new Map<string, EffectiveItem>();
  for (const g of [...rolled.values()].sort((a, b) => a.id - b.id)) {
    for (const l of g.loot) {
      if (!l.in_season || l.item_status !== 'active') continue;
      const entry = items.get(l.item_alias) ?? { item_alias: l.item_alias, item_name: l.item_name, offers: [] };
      entry.offers.push({
        group_name: g.name,
        grant_mode: l.grant_mode,
        probability_percent: l.probability_percent === null ? null : Number(l.probability_percent),
      });
      items.set(l.item_alias, entry);
    }
  }

  return { locations: rows, items: [...items.values()] };
}
