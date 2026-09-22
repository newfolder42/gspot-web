export const mapMaxBounds = {
  ne: [46.9, 43.8] as [number, number], // [lng, lat] northeast
  sw: [39.4, 40.8] as [number, number], // [lng, lat] southwest
};

export const mapMaxZoom = 18;

export const mapDefaultCenter: [number, number] = [44.7898, 41.7230]; // [lng, lat] — Tbilisi area

// Camera levels shared with src/lib/map.ts — keep the two in step.
export const mapOverviewZoom = 12;      // initial view before anything is picked
export const mapPickedZoom = mapMaxZoom; // spot from photo GPS or "my location"
export const mapResultMaxZoom = 16;     // guess result: guess + photo fitted, capped
export const mapFitMaxZoom = 15;        // overview boards (guesses, checks) fitted, capped
export const mapFitPadding = 40;
export const mapResultPadding = { top: 60, right: 40, bottom: 120, left: 40 };

// Every pin is the Mapbox default teardrop (components/map/MapPin); only colour and scale vary.
export const mapPinColors = {
  pick: '#14B8A6',  // the user's own pin: a guess, a picked spot
  truth: '#ef4444', // the real answer: photo location, hiding spot
  line: '#fbbf24',  // dashed guess → answer line
};
export const mapPinScale = {
  primary: 1,   // the pin being placed, the answer, a winning check
  point: 0.75,  // one of many on an overview board
};

type Padding = { top: number; right: number; bottom: number; left: number };

// Mapbox renders the world 512 px wide at zoom 0.
const WORLD_TILE_PX = 512;

const mercatorX = (lng: number) => (lng + 180) / 360;
const mercatorY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};
const latFromMercatorY = (y: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;

/**
 * Centre and zoom that fit every point into a viewport, like mapbox-gl's
 * `fitBounds({ padding, maxZoom })` on web — rnmapbox's own fitBounds has no maxZoom,
 * so a single point or a very close guess would otherwise land at max zoom.
 */
export function fitCamera(
  points: [number, number][], // [lng, lat]
  viewport: { width: number; height: number },
  padding: number | Padding,
  maxZoom: number
): { centerCoordinate: [number, number]; zoomLevel: number } {
  const pad = typeof padding === 'number'
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : padding;

  const xs = points.map(([lng]) => mercatorX(lng));
  const ys = points.map(([, lat]) => mercatorY(lat));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const innerW = Math.max(1, viewport.width - pad.left - pad.right);
  const innerH = Math.max(1, viewport.height - pad.top - pad.bottom);
  const zoomX = maxX > minX ? Math.log2(innerW / ((maxX - minX) * WORLD_TILE_PX)) : Infinity;
  const zoomY = maxY > minY ? Math.log2(innerH / ((maxY - minY) * WORLD_TILE_PX)) : Infinity;
  const zoomLevel = Math.max(0, Math.min(zoomX, zoomY, maxZoom));

  // Centre the padded box, not the raw points, so uneven padding shifts them clear of overlays.
  const worldPx = WORLD_TILE_PX * 2 ** zoomLevel;
  const cx = (minX + maxX) / 2 + (pad.right - pad.left) / 2 / worldPx;
  const cy = (minY + maxY) / 2 + (pad.bottom - pad.top) / 2 / worldPx;

  return { centerCoordinate: [cx * 360 - 180, latFromMercatorY(cy)], zoomLevel };
}
