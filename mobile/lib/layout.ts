import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Widest a single-column screen (feed, lists, profile) gets before it centres. */
export const CONTENT_MAX_WIDTH = 600;

/** Widest a sign-in / password form gets before it centres. */
export const FORM_MAX_WIDTH = 440;

/** Narrowest landscape screen that still has room for two panes side by side. */
const TWO_PANE_MIN_WIDTH = 560;

/** The stack/tab header on Android; the status bar is added on top by `insets.top`. */
export const HEADER_HEIGHT = 56;

/** Tallest a post photo gets on a phone held upright (the old h-80 slot). */
const PORTRAIT_PHOTO_MAX_HEIGHT = 320;

/** Air a centred dialog keeps from the top and bottom edges of the window. */
const DIALOG_MARGIN = 16;

export type Layout = {
  width: number;
  height: number;
  isLandscape: boolean;
  /**
   * Landscape with room for two panes side by side: the post page, the submit
   * form and the guess screen split in two instead of stacking.
   */
  isTwoPane: boolean;
  /** Width of the window once the notch / navigation bar at its sides are taken off. */
  availableWidth: number;
  /**
   * Horizontal padding that centres a `CONTENT_MAX_WIDTH` column; 0 on a phone
   * held upright, so portrait lays out exactly as it always has. Put it on a
   * scroller's `contentContainerStyle` rather than narrowing the scroller, or
   * the empty margins stop scrolling.
   */
  gutter: number;
  /** Like `gutter`, for a column of any other width. */
  gutterFor: (maxWidth: number) => number;
  /** Tallest a single post photo may get while still fitting on screen under the header. */
  photoMaxHeight: number;
};

/**
 * One place for everything that depends on how the window is shaped. Reads the
 * live window (`useWindowDimensions`), never `Dimensions.get` at module level —
 * that is read once at load and goes stale on the first rotation.
 */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLandscape = width > height;
  const availableWidth = Math.max(0, width - insets.left - insets.right);
  const gutterFor = (maxWidth: number) => Math.max(0, Math.round((availableWidth - maxWidth) / 2));

  // Upright, the slot is the fixed 320. Sideways the window is shorter than that
  // plus the header, so the photo may use whatever is left under it.
  const visibleHeight = height - insets.top - insets.bottom - HEADER_HEIGHT;
  const photoMaxHeight = isLandscape
    ? Math.min(400, Math.max(200, visibleHeight))
    : PORTRAIT_PHOTO_MAX_HEIGHT;

  return {
    width,
    height,
    isLandscape,
    isTwoPane: isLandscape && availableWidth >= TWO_PANE_MIN_WIDTH,
    availableWidth,
    gutter: gutterFor(CONTENT_MAX_WIDTH),
    gutterFor,
    photoMaxHeight,
  };
}

/**
 * Height for the scrolling part of a centred dialog: what the window leaves once the
 * safe areas, the dialog's margin and its own fixed rows (`chrome`: header, footer,
 * padding) are taken off, capped at `max`. Upright that is `max`, as before; sideways
 * the window is shorter than the dialog was designed for.
 */
export function useDialogScrollHeight(chrome: number, max: number): number {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return Math.max(120, Math.min(max, height - insets.top - insets.bottom - DIALOG_MARGIN * 2 - chrome));
}
