import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { useTheme } from '@/constants/colors';

const DRAWER_WIDTH = 280;
const EDGE_ZONE_WIDTH = 24;
/** Past this much drag (or a flick this fast) the panel settles open/closed. */
const SWIPE_THRESHOLD = 50;
const FLING_VELOCITY = 0.35;

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
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <Feather name={icon} size={20} color={theme.icon} />
      <Text className="text-sm text-zinc-900 dark:text-zinc-100">{label}</Text>
    </Pressable>
  );
}

export function AppDrawer({ open, onClose, onOpen }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  // The backdrop tracks the panel, so a half-open drag is half-dimmed.
  const opacity = translateX.interpolate({
    inputRange: [-DRAWER_WIDTH, 0],
    outputRange: [0, 1],
  });

  // While a finger owns the panel the modal has to stay mounted even though
  // `open` is still false (opening drag) or already false (closing drag).
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const setDrag = useCallback((value: boolean) => {
    draggingRef.current = value;
    setDragging(value);
  }, []);

  // Programmatic open/close (menu button, navigation). Skipped mid-drag so the
  // animation never fights the finger.
  useEffect(() => {
    if (draggingRef.current) return;
    Animated.timing(translateX, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [open]);

  // Callbacks read through refs so the pan responders can stay stable across
  // renders — swapping panHandlers mid-gesture would drop the drag.
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  });

  // Release handler: snap to whichever end the drag was headed for.
  const settleRef = useRef((toOpen: boolean) => {
    Animated.spring(translateX, {
      toValue: toOpen ? 0 : -DRAWER_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
      // A grab that interrupts the settle reports `finished: false`; the new
      // drag owns the panel from then on, so leave its flag alone.
    }).start(({ finished }) => { if (finished) setDrag(false); });
    if (toOpen) onOpenRef.current?.();
    else onCloseRef.current();
  });

  const nav = (path: any, params?: any) => {
    onClose();
    router.push(params ? { pathname: path, params } : path);
  };

  const clamp = (value: number) => Math.max(-DRAWER_WIDTH, Math.min(0, value));

  // Drag right from the left edge – the panel follows the finger from the very
  // first pixel instead of popping in once the gesture ends.
  const edgePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        setDrag(true);
      },
      onPanResponderMove: (_, gs) => translateX.setValue(clamp(-DRAWER_WIDTH + gs.dx)),
      // The feed sits underneath; don't hand a started drag back to it.
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gs) =>
        settleRef.current(gs.dx > SWIPE_THRESHOLD || gs.vx > FLING_VELOCITY),
      onPanResponderTerminate: (_, gs) => settleRef.current(gs.dx > SWIPE_THRESHOLD),
    })
  ).current;

  // Drag left on the open panel – same tracking, in reverse.
  const drawerPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx < -6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        setDrag(true);
      },
      onPanResponderMove: (_, gs) => translateX.setValue(clamp(gs.dx)),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gs) =>
        settleRef.current(!(gs.dx < -SWIPE_THRESHOLD || gs.vx < -FLING_VELOCITY)),
      onPanResponderTerminate: (_, gs) => settleRef.current(!(gs.dx < -SWIPE_THRESHOLD)),
    })
  ).current;

  const { data: zonesData } = useQuery({
    queryKey: ['zones-list'],
    queryFn: () => searchApi.getZones(),
    // Fetch as soon as the panel starts sliding in, not once it lands.
    enabled: open || dragging,
    staleTime: 60_000,
  });

  const myZones: MobileZone[] = zonesData?.zones.filter((z) => z.isMember) ?? [];

  return (
    <>
      {/* Left-edge drag zone – mounted whenever the panel is closed */}
      {!open && (
        <View
          {...edgePanResponder.panHandlers}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE_ZONE_WIDTH, zIndex: 1 }}
          pointerEvents="box-only"
        />
      )}

      <Modal
        visible={open || dragging}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Animated.View
          style={{ flex: 1, backgroundColor: theme.overlay, opacity }}
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
          <View style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50">G'Spot</Text>
              <Pressable onPress={onClose}>
                <Feather name="x" size={20} color={theme.icon} />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 pt-2">
            {/* Main nav – mirrors the web left panel ordering */}
            <DrawerLink icon="home" label="მთავარი" onPress={() => nav('/(app)/(tabs)/')} />
            <DrawerLink icon="map-pin" label="გამოსაცნობები" onPress={() => nav('/(app)/(tabs)/to-guess')} />
            <DrawerLink icon="eye" label="დამალობანა" onPress={() => nav('/(app)/hide-and-seek')} />
            <DrawerLink icon="users" label="მომხმარებლები" onPress={() => nav('/(app)/new-users')} />
            <DrawerLink icon="grid" label="საბზონები" onPress={() => nav('/(app)/zones')} />
            <DrawerLink icon="map" label="რუკა" onPress={() => nav('/(app)/heatmap')} />
            <DrawerLink icon="bell" label="შეტყობინებები" onPress={() => nav('/(app)/(tabs)/notifications')} />

            {/* My zones */}
            {myZones.length > 0 ? (
              <View className="mt-4">
                <View className="px-4 pb-2">
                  <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">ჩემი საბზონები</Text>
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
          <View style={{ paddingBottom: insets.bottom + 4, borderTopWidth: 1, borderTopColor: theme.border }} className="pt-1">
            <DrawerLink icon="info" label="ჩვენს შესახებ" onPress={() => nav('/(app)/about')} />
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}
