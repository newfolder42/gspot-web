import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { FeedList } from '@/components/feed/FeedList';
import { AppDrawer } from '@/components/ui/AppDrawer';
import { feedApi } from '@/lib/feed';

export default function HomeScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => setDrawerOpen(true)} style={{ marginLeft: 14 }}>
          <Feather name="menu" size={22} color="#A1A1AA" />
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <ScreenLayout>
      <FeedList queryKey={['global-feed']} loader={feedApi.loadGlobal} />
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
    </ScreenLayout>
  );
}
