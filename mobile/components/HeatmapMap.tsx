import { useMemo } from 'react';
import { Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import type { HeatmapPointType } from '@/types/heatmap';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

// A lone post still has to burn, so the ramp starts at a floor instead of zero
// (matches web heatmap-map.tsx).
const LONE_POST_WEIGHT = 0.45;

type Props = {
  points: HeatmapPointType[];
  maxZoom: number;
  /** Zoom at which individual dots take over from the blur. */
  pointZoom: number;
  emptyMessage: string;
};

export function HeatmapMap({ points, maxZoom, pointZoom, emptyMessage }: Props) {
  const shape = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: points.map((p) => ({
        type: 'Feature' as const,
        properties: { weight: p.weight },
        geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
      })),
    }),
    [points]
  );

  const maxWeight = useMemo(() => points.reduce((max, p) => Math.max(max, p.weight), 1), [points]);

  // Interpolate stops must strictly ascend, so the top stop is pinned above the mid one.
  const topZoom = Math.max(maxZoom, 10);
  // When the dots would only show at the very last zoom level, drop them instead.
  const showPoints = pointZoom < maxZoom;

  // Equal stops are a style error, so a map where every cell has one post skips the ramp.
  const heatmapWeight: any =
    maxWeight > 1
      ? ['interpolate', ['linear'], ['get', 'weight'], 1, LONE_POST_WEIGHT, maxWeight, 1]
      : LONE_POST_WEIGHT;

  if (points.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 text-center">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <MapboxGL.MapView
      style={{ flex: 1 }}
      styleURL="mapbox://styles/mapbox/standard-satellite"
      scrollEnabled
      pitchEnabled={false}
      rotateEnabled={false}
      attributionEnabled={false}
      logoEnabled={false}
    >
      <MapboxGL.Camera
        centerCoordinate={mapDefaultCenter}
        zoomLevel={6}
        maxBounds={mapMaxBounds}
        maxZoomLevel={Math.min(maxZoom, mapMaxZoom)}
      />

      {/* ShapeSource types its children as a single ReactElement, so the
          optional point layer is wrapped in a fragment rather than inlined. */}
      <MapboxGL.ShapeSource id="heatmap-source" shape={shape}>
        <>
        <MapboxGL.HeatmapLayer
          id="heatmap-layer"
          sourceID="heatmap-source"
          style={{
            heatmapWeight,
            heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 0, 1, topZoom, 3],
            // Colour arrives early so an isolated cell reads as a clear blob, not a faint smudge.
            heatmapColor: [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(13, 148, 136, 0)',
              0.1, 'rgba(13, 148, 136, 0.5)',
              0.3, 'rgba(56, 189, 248, 0.7)',
              0.5, 'rgba(250, 204, 21, 0.8)',
              0.75, 'rgba(249, 115, 22, 0.9)',
              1, 'rgba(220, 38, 38, 0.95)',
            ],
            heatmapRadius: ['interpolate', ['linear'], ['zoom'], 0, 6, 9, 22, topZoom, 46],
            // Fades back where the individual dots take over.
            heatmapOpacity: showPoints
              ? ['interpolate', ['linear'], ['zoom'], pointZoom, 0.9, topZoom, 0.35]
              : 0.85,
          }}
        />

        {showPoints ? (
          <MapboxGL.CircleLayer
            id="heatmap-points"
            sourceID="heatmap-source"
            minZoomLevel={pointZoom}
            style={{
              circleRadius: ['interpolate', ['linear'], ['zoom'], pointZoom, 3, topZoom, 9],
              circleColor: 'rgba(248, 250, 252, 0.9)',
              circleStrokeColor: 'rgba(220, 38, 38, 0.9)',
              circleStrokeWidth: 1.5,
              circleOpacity: ['interpolate', ['linear'], ['zoom'], pointZoom, 0, topZoom, 0.85],
            }}
          />
        ) : null}
        </>
      </MapboxGL.ShapeSource>
    </MapboxGL.MapView>
  );
}
