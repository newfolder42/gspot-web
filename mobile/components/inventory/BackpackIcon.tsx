import Svg, { Path } from 'react-native-svg';

export function BackpackIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M5 21a1 1 0 0 1-1-1v-9a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v9a1 1 0 0 1-1 1z" />
      <Path d="M9 5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
      <Path d="M8 21v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6" />
      <Path d="M10.5 17h3" />
    </Svg>
  );
}
