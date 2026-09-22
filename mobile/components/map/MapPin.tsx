import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

const WIDTH = 27;
const HEIGHT = 41;

/**
 * The tip sits 34.5 px down the 41 px marker (mapbox-gl draws its default marker
 * centred with a -14 px offset). Pass this as the annotation's `anchor` so the tip,
 * not the middle of the drawing, lands on the coordinate — guesses are scored in metres.
 */
export const MAP_PIN_ANCHOR = { x: 0.5, y: 34.5 / HEIGHT };

/**
 * The Mapbox default teardrop, drawn the same as `new mapboxgl.Marker({ color, scale })`
 * on web, so a pin looks identical on every map in both apps.
 */
export function MapPin({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <Svg width={WIDTH * scale} height={HEIGHT * scale} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {/* Copied from mapbox-gl v3 Marker._createDefaultMarker */}
      <Defs>
        <RadialGradient id="mapPinShadow">
          <Stop offset="10%" stopOpacity={0.4} />
          <Stop offset="100%" stopOpacity={0.05} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={13.5} cy={34.8} rx={10.5} ry={5.25} fill="url(#mapPinShadow)" />
      <Path
        fill={color}
        d="M27,13.5C27,19.07 20.25,27 14.75,34.5C14.02,35.5 12.98,35.5 12.25,34.5C6.75,27 0,19.22 0,13.5C0,6.04 6.04,0 13.5,0C20.96,0 27,6.04 27,13.5Z"
      />
      <Path
        opacity={0.25}
        d="M13.5,0C6.04,0 0,6.04 0,13.5C0,19.22 6.75,27 12.25,34.5C13,35.52 14.02,35.5 14.75,34.5C20.25,27 27,19.07 27,13.5C27,6.04 20.96,0 13.5,0ZM13.5,1C20.42,1 26,6.58 26,13.5C26,15.9 24.5,19.18 22.22,22.74C19.95,26.3 16.71,30.14 13.94,33.91C13.74,34.18 13.61,34.32 13.5,34.44C13.39,34.32 13.26,34.18 13.06,33.91C10.28,30.13 7.41,26.31 5.02,22.77C2.62,19.23 1,15.95 1,13.5C1,6.58 6.58,1 13.5,1Z"
      />
      <Circle fill="#fff" cx={13.5} cy={13.5} r={5.5} />
    </Svg>
  );
}
