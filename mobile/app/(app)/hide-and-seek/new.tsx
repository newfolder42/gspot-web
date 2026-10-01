import { CreateHideAndSeek } from '@/components/hideandseek/CreateHideAndSeek';
import { KeyboardScrollView } from '@/components/ui/KeyboardScrollView';
import { useTheme } from '@/constants/colors';

/** Standalone route for creating a game; the same form also lives in the submit tabs. */
export default function NewHideAndSeekScreen() {
  const theme = useTheme();

  return (
    <KeyboardScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <CreateHideAndSeek />
    </KeyboardScrollView>
  );
}
