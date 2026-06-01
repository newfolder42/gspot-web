import { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { searchApi, type MobileZone } from '@/lib/search';

const DRAWER_WIDTH = 280;
const EDGE_ZONE_WIDTH = 20;
const SWIPE_THRESHOLD = 50;

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
};

function DrawerLink({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <Feather name={icon} size={20} color="#71717A" />
      <Text className="text-sm text-zinc-900 dark:text-zinc-100">{label}</Text>
    </Pressable>
  );
}

export function AppDrawer({ open, onClose, onOpen }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: open ? 0 : -DRAWER_WIDTH,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: open ? 1 : 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open]);

  const nav = (path: any, params?: any) => {
    onClose();
    router.push(params ? { pathname: path, params } : path);
  };

  const openAbout = () => {
    onClose();
    Linking.openURL('https://gspot.ge/about');
  };

  // Swipe right from left edge → open drawer
  const edgePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) onOpen?.();
      },
    })
  ).current;

  // Swipe left on drawer panel → close drawer
  const drawerPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx < -8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -SWIPE_THRESHOLD) onClose();
      },
    })
  ).current;

  const { data: zonesData } = useQuery({
    queryKey: ['zones-list'],
    queryFn: () => searchApi.getZones(),
    enabled: open,
    staleTime: 60_000,
  });

  const myZones: MobileZone[] = zonesData?.zones.filter((z) => z.isMember) ?? [];

  return (
    <>
      {/* Left-edge swipe zone – always mounted, opens drawer on right-swipe */}
      {!open && (
        <View
          {...edgePanResponder.panHandlers}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE_ZONE_WIDTH, zIndex: 1 }}
          pointerEvents="box-only"
        />
      )}

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Animated.View
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity }}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* Drawer panel */}
        <Animated.View
          {...drawerPanResponder.panHandlers}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            transform: [{ translateX }],
          }}
          className="bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"
        >
          {/* Header */}
          <View style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#3f3f46' }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">G'Spot</Text>
              <Pressable onPress={onClose}>
                <Feather name="x" size={20} color="#71717A" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 pt-2">
            {/* Main nav */}
            <DrawerLink icon="home" label="მთავარი" onPress={() => nav('/(app)/(tabs)/')} />
            <DrawerLink icon="grid" label="საბზონები" onPress={() => nav('/(app)/zones')} />
            <DrawerLink icon="bell" label="შეტყობინებები" onPress={() => nav('/(app)/(tabs)/notifications')} />

            {/* My zones */}
            {myZones.length > 0 ? (
              <View className="mt-4">
                <View className="px-4 pb-2">
                  <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">ჩემი საბზონები</Text>
                </View>
                {myZones.map((zone) => (
                  <Pressable
                    key={zone.id}
                    onPress={() => nav('/(app)/zone/[slug]', { slug: zone.slug })}
                    className="flex-row items-center gap-3 px-4 py-2.5 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800"
                  >
                    <ProfileAvatar name={zone.slug} photoUrl={zone.profilePhotoUrl} size={24} shape="md" />
                    <Text className="text-sm text-zinc-800 dark:text-zinc-200">{zone.slug}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {/* Pinned bottom – About */}
          <View style={{ paddingBottom: insets.bottom + 4, borderTopWidth: 1, borderTopColor: '#3f3f46' }} className="pt-1">
            <DrawerLink icon="info" label="ჩვენს შესახებ" onPress={openAbout} />
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}
