import { forwardRef } from 'react';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

/**
 * The scroller for any screen or form with a text input.
 *
 * `KeyboardProvider` takes over Android's window resizing, so a plain ScrollView
 * keeps its full height under the keyboard: whatever lands behind it can no
 * longer be scrolled into view. This one extends its scroll range by the
 * keyboard's height, so the whole page stays reachable while typing, and lifts
 * the focused field (plus `bottomOffset` of breathing room) above the keyboard.
 *
 * Styling goes through `style`/`contentContainerStyle`; NativeWind's `className`
 * only reaches core components.
 */
export const KeyboardScrollView = forwardRef<KeyboardAwareScrollViewRef, KeyboardAwareScrollViewProps>(
  ({ bottomOffset = 24, keyboardShouldPersistTaps = 'handled', ...props }, ref) => (
    <KeyboardAwareScrollView
      ref={ref}
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    />
  )
);

KeyboardScrollView.displayName = 'KeyboardScrollView';
