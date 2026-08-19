import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (for forms that may overflow) */
  scroll?: boolean;
  /**
   * Which sides get safe-area padding. Screens sitting inside a navigator that
   * already draws a header and/or a tab bar must opt out of those edges —
   * react-navigation consumes those insets itself, and padding them twice
   * leaves an empty band above/below the content.
   */
  edges?: readonly Edge[];
};

export function ScreenLayout({ children, scroll = false, edges = ['top', 'bottom'] }: Props) {
  const inner = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={edges}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
