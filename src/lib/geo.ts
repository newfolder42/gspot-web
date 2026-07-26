import boundary from '@/data/georgia-boundary.json';

// Boundary polygon for Georgia, derived from geoBoundaries gbOpen GEO ADM0
// (CC BY-SA 2.0) and simplified to ~55m tolerance. Abkhazia and South Ossetia
// are inside the polygon. Rebuilt only by hand — see src/data/README.md.
type Ring = [number, number][];

const [west, south, east, north] = boundary.bbox as [number, number, number, number];
const polygons = boundary.polygons as unknown as Ring[][];

// Ray casting: count crossings of a horizontal ray from the point going west.
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// True when the coordinate falls inside Georgia's land border. Accurate to
// roughly 100m at the border, so points on the line itself may go either way.
export function isInGeorgia(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Bounding box rejects everything outside the Caucasus without a ring scan.
  if (lng < west || lng > east || lat < south || lat > north) return false;

  for (const rings of polygons) {
    if (!pointInRing(lng, lat, rings[0])) continue;
    // Any ring after the first is a hole punched out of the outer ring.
    let inHole = false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}
