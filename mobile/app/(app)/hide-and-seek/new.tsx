import { CreateHideAndSeek } from '@/components/hideandseek/CreateHideAndSeek';
import { KeyboardScrollView } from '@/components/ui/KeyboardScrollView';
import { useTheme } from '@/constants/colors';
import { useLayout } from '@/lib/layout';

/** Standalone route for creating a game; the same form also lives in the submit tabs. */
export default function NewHideAndSeekScreen() {
  const theme = useTheme();
  const { gutter } = useLayout();

  return (
    <KeyboardScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingHorizontal: 16 + gutter }}
    >
      <CreateHideAndSeek />
    </KeyboardScrollView>
  );
}
