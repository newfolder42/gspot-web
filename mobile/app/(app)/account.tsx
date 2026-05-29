import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import type { OwnAccountData } from './account.types';

// ─── Avatar ──────────────────────────────────────────────────────────────────

function getInitials(alias: string): string {
  return alias.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#06B6D4',
];

function getAvatarColor(alias: string): string {
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ alias }: { alias: string }) {
  const bg = getAvatarColor(alias);
  return (
    <View
      className="h-20 w-20 rounded-xl items-center justify-center"
      style={{ backgroundColor: bg }}
    >
      <Text className="text-white text-2xl font-bold">{getInitials(alias)}</Text>
    </View>
  );
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 100;

function XPBar({ xp, level }: { xp: number; level: number }) {
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  return (
    <View>
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">Level {level}</Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">{xp} XP</Text>
      </View>
      <View className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <View
          className="h-full rounded-full bg-brand"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </View>
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3.5 border-b border-zinc-100 dark:border-zinc-800">
      <Feather name={icon as any} size={18} color="#71717A" />
      <Text className="text-zinc-500 dark:text-zinc-400 ml-3 text-sm w-24">{label}</Text>
      <Text className="flex-1 text-zinc-800 dark:text-zinc-200 text-sm text-right">{value}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const { user, logout } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<OwnAccountData>({
    queryKey: ['account', 'me'],
    queryFn: () => apiClient.get('/account/me').then((r) => r.data),
    enabled: !!user,
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#FF6314" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">
          Could not load account.
        </Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const { user: profile, profilePhoto, level } = data;
  const memberYears = profile.age ?? 0;
  const memberLabel =
    memberYears === 0 ? 'New member' : memberYears === 1 ? '1 year' : `${memberYears} years`;

  return (
    <ScrollView
      className="flex-1 bg-zinc-50 dark:bg-zinc-950"
      contentContainerClassName="pb-10"
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <View className="mx-4 mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
        <View className="flex-row gap-4 items-center">
          <Avatar alias={profile.alias} />
          <View className="flex-1">
            <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              &apos;{profile.alias}
            </Text>
            <Text className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5 mb-3">
              {profile.email}
            </Text>
            {level ? (
              <XPBar xp={level.xp} level={level.level} />
            ) : null}
          </View>
        </View>
      </View>

      {/* Info section */}
      <View className="mx-4 mt-3 bg-white dark:bg-zinc-900 rounded-2xl px-4 border border-zinc-100 dark:border-zinc-800">
        <InfoRow icon="clock" label="Member for" value={memberLabel} />
        <InfoRow icon="user" label="Username" value={`'${profile.alias}`} />
        <InfoRow icon="mail" label="Email" value={profile.email} />
      </View>

      {/* Actions */}
      <View className="mx-4 mt-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <Pressable
          onPress={handleLogout}
          className="flex-row items-center px-4 py-4 active:bg-zinc-50 dark:active:bg-zinc-800"
          android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
        >
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text className="text-red-500 ml-3 text-base font-medium">Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
