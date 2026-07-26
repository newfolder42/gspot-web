export const mapMaxBounds = [[39.4, 40.8], [46.9, 43.8]]; //[west, south], [east, north]
export const mapMaxZoom = 18;
export const mapDefaultCenter: [number, number] = [44.7898, 41.7230];

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