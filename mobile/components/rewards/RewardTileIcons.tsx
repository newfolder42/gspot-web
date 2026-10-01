import Svg, { Path, Rect } from 'react-native-svg';

/** Ports of web ProgressIcon / GiftIcon (src/components/icons), used by the reward tiles and RewardButton. */

type Props = { size?: number; color: string };

export function ProgressIcon({ size = 20, color }: Props) {
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
      <Rect x="2" y="7" width="18" height="10" rx="2" />
      <Rect x="5" y="9.5" width="3" height="5" rx="0.5" fill={color} stroke="none" />
      <Rect x="9.5" y="9.5" width="3" height="5" rx="0.5" fill={color} stroke="none" />
    </Svg>
  );
}

export function GiftIcon({ size = 20, color }: Props) {
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
      <Rect x="3" y="8" width="18" height="4" rx="1" />
      <Path d="M12 8v13" />
      <Path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <Path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8" />
      <Path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
    </Svg>
  );
}
