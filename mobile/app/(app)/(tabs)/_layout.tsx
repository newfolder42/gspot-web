import { Tabs, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Tabs navigator for the main (tabs) group.
 * Auth guard is handled by the parent (app)/_layout.tsx Stack.
 */
export default function TabsLayout() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const SearchButton = () => (
    <Pressable onPress={() => router.push('/(app)/search')} style={{ marginRight: 14 }}>
      <Feather name="search" size={20} color="#A1A1AA" />
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#18181B' },
        headerTintColor: '#EDEDED',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#18181B',
          borderTopColor: '#27272A',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#14B8A6',
        tabBarInactiveTintColor: '#71717A',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "G'Spot",
          tabBarLabel: 'მთავარი',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
          headerRight: () => <SearchButton />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'დამატება',
          tabBarLabel: 'დამატება',
          tabBarIcon: ({ color, size }) => <Feather name="plus-circle" size={size} color={color} />,
          headerRight: () => <SearchButton />,
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
          headerRight: () => <SearchButton />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'შენი სივრცე',
          tabBarLabel: 'შენი სივრცე',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
          headerRight: () => <SearchButton />,
        }}
      />
    </Tabs>
  );
}
