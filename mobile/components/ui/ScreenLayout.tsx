import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { KeyboardScrollView } from '@/components/ui/KeyboardScrollView';
import { FORM_MAX_WIDTH, useLayout } from '@/lib/layout';

type Props = {
  children: React.ReactNode;
  /**
   * Wrap content in a keyboard-aware ScrollView (for forms that may overflow).
   * The form is kept to a centred column once the window is wider than a phone.
   */
  scroll?: boolean;
  /**
   * Which sides get safe-area padding. Screens sitting inside a navigator that
   * already draws a header and/or a tab bar must opt out of those edges —
   * react-navigation consumes those insets itself, and padding them twice
   * leaves an empty band above/below the content.
   */
  edges?: readonly Edge[];
  /**
   * Pad the content up when the keyboard opens. Turn off for screens with no text
   * input (the feeds): the padding follows keyboard events, and one that fires while
   * the screen sits under another — typing a comment, then going back — can leave the
   * padding behind as a dead band at the bottom of the list.
   */
  avoidKeyboard?: boolean;
};

export function ScreenLayout({ children, scroll = false, edges = ['top', 'bottom'], avoidKeyboard = true }: Props) {
  const { gutterFor } = useLayout();

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={edges}>
      {scroll ? (
        <KeyboardScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: gutterFor(FORM_MAX_WIDTH) }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </KeyboardScrollView>
      ) : !avoidKeyboard ? (
        <View style={{ flex: 1 }}>{children}</View>
      ) : (
        // keyboard-controller's variant follows the keyboard frame by frame and, with
        // `automaticOffset`, measures where it sits in the window — so it stops right
        // at the keyboard under a header or above a tab bar without hand-tuned offsets.
        <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
          {children}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
