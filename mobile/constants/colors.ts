import { useColorScheme } from 'react-native';

/**
 * Scheme-independent colours. Brand, semantics, and the few values that always
 * sit on a fixed ground (white on a teal button, zinc-50 on a photo scrim).
 */
export const Colors = {
  // Brand / accent (teal)
  brand: '#14B8A6',
  brandPressed: '#0D9488',

  // Semantic
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',

  /** Foreground on a filled brand/danger button or a photo scrim. */
  onAccent: '#FFFFFF',
  onImage: '#FAFAFA',
  /** Chrome drawn over a photo (close buttons, map overlays). */
  onImageMuted: '#E4E4E7',
} as const;

/**
 * The scheme-dependent half of the palette. Mirrors the web app's zinc scale:
 * `bg-white dark:bg-zinc-900` chrome over a `bg-zinc-50 dark:bg-zinc-950` page.
 */
export type Theme = {
  scheme: 'light' | 'dark';
  /** Screen background. */
  bg: string;
  /** Cards, sheets, drawers — one step above `bg`. */
  surface: string;
  /** Inputs, chips, inactive segment fills. */
  surfaceAlt: string;
  border: string;
  /** Dividers that need to read against `surface`. */
  borderStrong: string;
  text: string;
  textMuted: string;
  /** Default icon tint next to muted text. */
  icon: string;
  /** Big empty-state / placeholder icons. */
  iconFaint: string;
  headerBg: string;
  headerTint: string;
  tabBarBg: string;
  tabBarBorder: string;
  /** Unfilled half of a Switch track. */
  switchTrackOff: string;
  /** Dimmer behind modals and sheets. */
  overlay: string;
  /** Android press ripple — a black wash is invisible on a dark surface. */
  ripple: string;
};

const light: Theme = {
  scheme: 'light',
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F4F5',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
  text: '#171717',
  textMuted: '#71717A',
  icon: '#71717A',
  iconFaint: '#D4D4D8',
  headerBg: '#FFFFFF',
  headerTint: '#27272A',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E4E4E7',
  switchTrackOff: '#D4D4D8',
  overlay: 'rgba(0,0,0,0.45)',
  ripple: 'rgba(0,0,0,0.10)',
};

const dark: Theme = {
  scheme: 'dark',
  bg: '#09090B',
  surface: '#18181B',
  surfaceAlt: '#27272A',
  border: '#27272A',
  borderStrong: '#3F3F46',
  text: '#EDEDED',
  textMuted: '#A1A1AA',
  icon: '#A1A1AA',
  iconFaint: '#3F3F46',
  headerBg: '#18181B',
  headerTint: '#EDEDED',
  tabBarBg: '#18181B',
  tabBarBorder: '#27272A',
  switchTrackOff: '#3F3F46',
  overlay: 'rgba(0,0,0,0.6)',
  ripple: 'rgba(255,255,255,0.12)',
};

/**
 * Resolves the palette for the current system appearance. NativeWind's
 * `darkMode: 'media'` reads the same source, so `dark:` classes and these
 * tokens always agree.
 */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
