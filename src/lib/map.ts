export const mapMaxBounds = [[39.4, 40.8], [46.9, 43.8]]; //[west, south], [east, north]
export const mapMaxZoom = 18;
export const mapDefaultCenter: [number, number] = [44.7898, 41.7230];

// Camera levels shared with mobile/lib/map.ts — keep the two in step.
export const mapOverviewZoom = 12;      // initial view before anything is picked
export const mapPickedZoom = mapMaxZoom; // spot from photo GPS or "my location"
export const mapResultMaxZoom = 16;     // guess result: guess + photo fitted, capped
export const mapFitMaxZoom = 15;        // overview boards (guesses, checks) fitted, capped
export const mapFitPadding = 40;
export const mapResultPadding = { top: 60, right: 40, bottom: 120, left: 40 };

// Every pin is the Mapbox default teardrop; only colour and scale vary.
export const mapPinColors = {
  pick: '#14B8A6',  // the user's own pin: a guess, a picked spot
  truth: '#ef4444', // the real answer: photo location, hiding spot
  line: '#fbbf24',  // dashed guess → answer line
};
export const mapPinScale = {
  primary: 1,   // the pin being placed, the answer, a winning check
  point: 0.75,  // one of many on an overview board
};

/**
 * Marker offset that keeps the tip on the coordinate at any scale: mapbox-gl's default
 * [0, -14] is fixed in pixels, so a scaled-down pin would otherwise sit below its point.
 */
export const mapPinOffset = (scale: number): [number, number] => [0, -14 * scale];

/** Popup offset that lifts a popup above a teardrop of the given scale instead of over it. */
export const mapPinPopupOffset = (scale: number) => Math.round(38 * scale);

export const heatmapGridMeters = 250;
export const heatmapOwnMaxZoom = 14;
export const heatmapGlobalMaxZoom = 12;

const metersPerLatDegree = 111320;
const lngDegreeScale = 0.74;

export function heatmapGridSteps(meters: number): { lat: number; lng: number } {
  return {
    lat: meters / metersPerLatDegree,
    lng: meters / (metersPerLatDegree * lngDegreeScale),
  };
}