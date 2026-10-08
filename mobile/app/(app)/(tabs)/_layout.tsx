import type { ReactElement } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { BackpackIcon } from '@/components/inventory/BackpackIcon';
import { SideInsets } from '@/components/ui/SideInsets';
import { useLayout } from '@/lib/layout';
import { Colors, useTheme } from '@/constants/colors';

/**
 * Tabs navigator for the main (tabs) group.
 * Auth guard is handled by the parent (app)/_layout.tsx Stack.
 */
export default function TabsLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  // Sideways, a bottom bar would cost 49dp of a ~360dp-tall window. The bar turns
  // into an icon rail down the left edge instead; it pads for the notch itself, so
  // the screens beside it only inset the right.
  const { isLandscape } = useLayout();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const HomeHeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={() => router.push('/(app)/inventory')} style={{ marginRight: 18 }}>
        <BackpackIcon size={20} color={theme.icon} />
      </Pressable>
      <Pressable onPress={() => router.push('/(app)/quest-log')} style={{ marginRight: 18 }}>
        <Feather name="flag" size={20} color={theme.icon} />
      </Pressable>
      <Pressable onPress={() => router.push('/(app)/search')} style={{ marginRight: 14 }}>
        <Feather name="search" size={20} color={theme.icon} />
      </Pressable>
    </View>
  );

  const AccountHeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={() => router.push('/(app)/inventory')} style={{ marginRight: 18 }}>
        <BackpackIcon size={20} color={theme.icon} />
      </Pressable>
      <Pressable onPress={() => router.push('/(app)/quest-log')} style={{ marginRight: 18 }}>
        <Feather name="flag" size={20} color={theme.icon} />
      </Pressable>
      <Pressable onPress={() => router.push('/(app)/settings')} style={{ marginRight: 14 }}>
        <Feather name="settings" size={20} color={theme.icon} />
      </Pressable>
    </View>
  );

  // `to-guess` is the full-bleed shuffle reel: it insets its own overlays.
  const screenLayout = ({ route, children }: { route: { name: string }; children: ReactElement }) =>
    route.name === 'to-guess' ? children : <SideInsets left={!isLandscape}>{children}</SideInsets>;

  return (
    <Tabs
      screenLayout={screenLayout}
      screenOptions={{
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.headerTint,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
        tabBarPosition: isLandscape ? 'left' : 'bottom',
        tabBarStyle: isLandscape
          ? {
              backgroundColor: theme.tabBarBg,
              borderRightColor: theme.tabBarBorder,
              borderRightWidth: 1,
              // A wide window makes the library size a sidebar like a 360dp drawer;
              // with icon-only tabs it should be as narrow as its icons.
              minWidth: 0,
            }
          : {
              backgroundColor: theme.tabBarBg,
              borderTopColor: theme.tabBarBorder,
              borderTopWidth: 1,
            },
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: theme.textMuted,
        // Icons only — the labels are kept as `tabBarLabel` for accessibility.
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "G'Spot",
          tabBarLabel: 'მთავარი',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
          headerRight: () => <HomeHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="to-guess"
        options={{
          title: 'გამოსაცნობები',
          tabBarLabel: 'გამოსაცნობი',
          // A dice, because the tab deals random photos for now.
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dice-5-outline" size={size + 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'დამატება',
          tabBarLabel: 'დამატება',
          tabBarIcon: ({ color, size }) => <Feather name="plus-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'შეტყობინებები',
          tabBarLabel: 'შეტყობინებები',
          tabBarIcon: ({ color, size }) => <Feather name="bell" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: { fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'შენი სივრცე',
          tabBarLabel: 'შენი სივრცე',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
          headerRight: () => <AccountHeaderRight />,
        }}
      />
    </Tabs>
  );
}
