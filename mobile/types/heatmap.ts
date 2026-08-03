/** Mirrors web src/types/heatmap.ts, plus the render hints the API sends along. */

export type HeatmapPointType = {
  latitude: number;
  longitude: number;
  weight: number;
};

export type HeatmapDataType = {
  points: HeatmapPointType[];
  totalPosts: number;
};

export type HeatmapResponse = HeatmapDataType & {
  /** Grid cell size the points were snapped to, in metres. */
  gridMeters: number;
  /** Zoom ceiling for this scope (own maps allow closer zoom than global). */
  maxZoom: number;
};
