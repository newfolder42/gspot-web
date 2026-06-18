import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (for forms that may overflow) */
  scroll?: boolean;
};

export function ScreenLayout({ children, scroll = false }: Props) {
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
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
