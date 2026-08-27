import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { FeedList } from '@/components/feed/FeedList';
import { FeedEventsStrip } from '@/components/feed/FeedEventsStrip';
import { AppDrawer } from '@/components/ui/AppDrawer';
import { feedApi } from '@/lib/feed';
import { useTheme } from '@/constants/colors';

export default function HomeScreen() {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => setDrawerOpen(true)} style={{ marginLeft: 14 }}>
          <Feather name="menu" size={22} color={theme.icon} />
        </Pressable>
      ),
    });
  }, [navigation, theme]);

  // The ამბები strip runs its own query, so pull-to-refresh has to refetch it too.
  const refreshStrip = useCallback(
    () => queryClient.refetchQueries({ queryKey: ['feed-events'] }),
    [queryClient]
  );

  return (
    <ScreenLayout edges={[]}>
      <FeedList
        queryKey={['global-feed']}
        loader={feedApi.loadGlobal}
        header={<FeedEventsStrip />}
        onRefresh={refreshStrip}
      />
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
    </ScreenLayout>
  );
}
