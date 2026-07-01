import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Input } from '@/components/ui/Input';
import { zonesApi, type ZoneMember } from '@/lib/zones';

const ROLE_LABELS: Record<string, string> = {
  owner: 'მფლობელი',
  admin: 'ადმინი',
  moderator: 'მოდერატორი',
  member: 'წევრი',
};

function MemberRow({ member }: { member: ZoneMember }) {
  const router = useRouter();
  const alias = member.user?.alias ?? '?';
  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800"
      onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias } })}
    >
      <ProfileAvatar name={alias} photoUrl={member.user?.profilePhoto ?? null} size={44} shape="md" />
      <View className="flex-1">
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">&apos;{alias}</Text>
        {member.role !== 'member' ? (
          <Text className="text-xs text-teal-600 dark:text-teal-400">{ROLE_LABELS[member.role] ?? member.role}</Text>
        ) : null}
      </View>
      {member.status === 'pending' ? (
        <Text className="text-xs text-amber-500">მოლოდინში</Text>
      ) : null}
    </Pressable>
  );
}

function InviteBox({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [alias, setAlias] = useState('');
  const [busy, setBusy] = useState(false);

  async function invite() {
    const value = alias.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await zonesApi.inviteMember(slug, value);
      setAlias('');
      Alert.alert('მოწვევა', 'მოწვევა გაიგზავნა.');
      queryClient.invalidateQueries({ queryKey: ['zone-members', slug] });
    } catch {
      Alert.alert('შეცდომა', 'მოწვევა ვერ გაიგზავნა. შეამოწმე მომხმარებლის სახელი.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center gap-2">
      <View className="flex-1">
        <Input placeholder="მომხმარებლის სახელი" value={alias} onChangeText={setAlias} autoCapitalize="none" />
      </View>
      <Pressable
        onPress={invite}
        disabled={busy}
        className={`h-12 px-4 rounded-xl bg-teal-600 items-center justify-center ${busy ? 'opacity-60' : ''}`}
      >
        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="user-plus" size={18} color="#fff" />}
      </Pressable>
    </View>
  );
}

export function MembersTab({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['zone-members', slug],
    queryFn: () => zonesApi.getMembers(slug),
    enabled: !!slug,
  });

  if (isLoading) {
    return <View className="py-10 items-center"><ActivityIndicator color="#14B8A6" /></View>;
  }
  if (isError || !data) {
    return (
      <View className="py-10 items-center px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 text-center">ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      {data.canInvite ? <InviteBox slug={slug} /> : null}
      {data.members.map((m) => (
        <MemberRow key={m.id} member={m} />
      ))}
      {data.members.length === 0 ? (
        <View className="py-10 items-center">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">წევრები არ არის</Text>
        </View>
      ) : null}
    </View>
  );
}
