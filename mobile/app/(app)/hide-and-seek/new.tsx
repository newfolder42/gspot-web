import { ScrollView } from 'react-native';
import { CreateHideAndSeek } from '@/components/hideandseek/CreateHideAndSeek';
import { useTheme } from '@/constants/colors';

/** Standalone route for creating a game; the same form also lives in the submit tabs. */
export default function NewHideAndSeekScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <CreateHideAndSeek />
    </ScrollView>
  );
}
