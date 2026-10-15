// Turns whatever was pasted into the location form into the single-line ring the
// item_locations.polygon column holds: one closed outer ring, [[lng, lat], …], longitude
// first (GeoJSON order). See src/data/INVENTORY.md in the main app.

export type Ring = [number, number][];

export type ParsedRing = { ring: Ring; error?: undefined } | { ring?: undefined; error: string };

// Georgia with a margin. Swapping the two numbers of every point is the easy mistake, it
// still looks like a valid ring, and the main app then never matches a post to it.
const BOUNDS = { minLng: 39.5, maxLng: 47.5, minLat: 40.5, maxLat: 44.0 };

export function inGeorgia(lng: number, lat: number): boolean {
  return lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng && lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat;
}

export const OUTSIDE_GEORGIA_ERROR =
  'კოორდინატები საქართველოს გარეთაა - შეამოწმე თანმიმდევრობა: [გრძედი, განედი] (lng, lat)';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// geojson.io hands out a FeatureCollection, and the ring sits three levels down in it. The
// docs say to paste only the ring, but unwrapping a pasted GeoJSON is cheaper than the
// round trip of an error.
function findRing(value: unknown): unknown {
  if (isRecord(value)) {
    if (value.type === 'FeatureCollection' && Array.isArray(value.features)) return findRing(value.features[0]);
    if (value.type === 'Feature') return findRing(value.geometry);
    if (value.type === 'Polygon' && Array.isArray(value.coordinates)) return value.coordinates[0];
    return value;
  }
  // [[[lng,lat],…]] is a polygon's list of rings, outer first; [[lng,lat],…] is the ring.
  if (Array.isArray(value) && Array.isArray(value[0]) && Array.isArray(value[0][0])) return value[0];
  return value;
}

export function parsePolygonJson(raw: string): ParsedRing {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'JSON არასწორია' };
  }

  const candidate = findRing(parsed);
  if (!Array.isArray(candidate) || candidate.length < 3) {
    return { error: 'მრავალკუთხედს მინიმუმ 3 წერტილი სჭირდება' };
  }

  const ring: Ring = [];
  for (let i = 0; i < candidate.length; i++) {
    const point: unknown = candidate[i];
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number' ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      return { error: `წერტილი ${i + 1} არასწორია - უნდა იყოს [გრძედი, განედი]` };
    }
    // a third value (altitude) is dropped - the column holds pairs only
    ring.push([point[0], point[1]]);
  }

  if (!ring.every(([lng, lat]) => inGeorgia(lng, lat))) {
    return { error: OUTSIDE_GEORGIA_ERROR };
  }

  return { ring };
}
