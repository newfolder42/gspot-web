import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Keeps a screen's content clear of whatever sits at the sides of the window in
 * landscape: the display cutout, or the navigation bar on three-button phones.
 *
 * Wraps only the content. Navigator headers and tab bars already pad for these
 * insets themselves, so padding the whole navigator would inset them twice.
 * Upright the side insets are 0 and this is a plain `flex: 1` view.
 */
export function SideInsets({ children, left = true }: { children: ReactElement; left?: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingLeft: left ? insets.left : 0, paddingRight: insets.right }}>
      {children}
    </View>
  );
}

/** Hand to a navigator as `screenLayout` to inset every screen's content. */
export function sideInsetsLayout({ children }: { children: ReactElement }) {
  return <SideInsets>{children}</SideInsets>;
}
