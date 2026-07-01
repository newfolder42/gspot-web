import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { QuestObjectiveCapture } from '@/components/zone/QuestObjectiveCapture';
import { questsApi } from '@/lib/quests';
import { formatPhotoTakenDate } from '@/lib/dates';
import type { ZoneQuestObjectiveWithProgressType } from '@/types/quest';

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  pending_review: 'განხილვაში',
  rejected: 'დაიწუნა',
  completed: 'შესრულებულია',
};

function isObjectiveAttemptable(
  objectives: ZoneQuestObjectiveWithProgressType[],
  objectiveOrder: string,
  objectiveId: number
): boolean {
  const target = objectives.find((o) => o.id === objectiveId);
  if (!target) return false;
  if (target.progressStatus === 'completed' || target.progressStatus === 'pending_review') return false;
  if (objectiveOrder !== 'ordered') return true;
  const sorted = [...objectives].sort((a, b) => a.sort_order - b.sort_order);
  for (const obj of sorted) {
    if (obj.id === objectiveId) return true;
    if (obj.progressStatus !== 'completed') return false;
  }
  return false;
}

export default function QuestDetailScreen() {
  const { slug, questId: questIdParam } = useLocalSearchParams<{ slug: string; questId: string }>();
  const questId = Number(questIdParam);
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [captureObjectiveId, setCaptureObjectiveId] = useState<number | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'მისია' });
  }, [navigation]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['quest', slug, questId],
    queryFn: () => questsApi.getQuest(slug, questId),
    enabled: !!slug && Number.isInteger(questId),
  });

  const acceptMutation = useMutation({
    mutationFn: () => questsApi.acceptQuest(slug, questId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quest', slug, questId] });
      queryClient.invalidateQueries({ queryKey: ['zone-quests', slug] });
    },
    onError: () => Alert.alert('შეცდომა', 'მისიის აღება ვერ მოხერხდა.'),
  });

  function invalidateAfterCapture() {
    queryClient.invalidateQueries({ queryKey: ['quest', slug, questId] });
    queryClient.invalidateQueries({ queryKey: ['zone-quests', slug] });
    queryClient.invalidateQueries({ queryKey: ['quest-log'] });
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">მისიის ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const { quest, character, objectives, userQuest, lockReason, canAccept, gallery } = data;
  const hasActiveUserQuest = !!userQuest && userQuest.status === 'active';
  const completedCount = objectives.filter((o) => o.progressStatus === 'completed').length;
  const captureObjective = captureObjectiveId != null ? objectives.find((o) => o.id === captureObjectiveId) ?? null : null;

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-zinc-950" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {/* Header */}
      <View className="flex-row items-start gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        {character ? (
          <Pressable onPress={() => router.push({ pathname: '/(app)/zone/[slug]/characters/[characterSlug]', params: { slug, characterSlug: character.slug } })}>
            <ProfileAvatar name={character.name} photoUrl={character.avatar_url} size={44} shape="full" />
          </Pressable>
        ) : (
          <View className="h-11 w-11 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
            <Feather name="flag" size={20} color="#a1a1aa" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{character ? character.name : 'ზონის მისია'}</Text>
          <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">{quest.title}</Text>
          {quest.description ? <Text className="text-sm text-zinc-600 dark:text-zinc-300 mt-1.5">{quest.description}</Text> : null}
          <View className="flex-row items-center gap-1.5 mt-2">
            <Feather name="flag" size={13} color="#a1a1aa" />
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">ჯილდო · 200 გამოცდილება</Text>
          </View>
          <View className="flex-row items-center gap-2 flex-wrap mt-1">
            {quest.start_date || quest.end_date ? (
              <View className="flex-row items-center gap-1.5">
                <Feather name="calendar" size={13} color="#a1a1aa" />
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                  {quest.start_date && quest.end_date
                    ? `${formatPhotoTakenDate(quest.start_date)} - ${formatPhotoTakenDate(quest.end_date)}`
                    : quest.start_date
                      ? `იწყება ${formatPhotoTakenDate(quest.start_date)}`
                      : `მთავრდება ${formatPhotoTakenDate(quest.end_date)}`}
                </Text>
              </View>
            ) : null}
            {quest.required_level ? (
              <View className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800">
                <Feather name="lock" size={11} color="#a1a1aa" />
                <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-300">დონე {quest.required_level}+</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {!userQuest && lockReason ? (
        <View className="flex-row items-start gap-2 mt-4">
          <Feather name="lock" size={15} color="#a1a1aa" />
          <Text className="text-sm text-zinc-500 dark:text-zinc-400 flex-1">{lockReason}</Text>
        </View>
      ) : null}

      {userQuest?.status === 'completed' ? (
        <View className="flex-row items-center gap-2 mt-4">
          <Feather name="check-circle" size={16} color="#14B8A6" />
          <Text className="text-sm text-teal-600 dark:text-teal-400">მისია შესრულებულია!</Text>
        </View>
      ) : null}

      {!userQuest && canAccept ? (
        <Pressable
          onPress={() => acceptMutation.mutate()}
          disabled={acceptMutation.isPending}
          className={`mt-4 flex-row items-center justify-center gap-2 rounded-md bg-teal-600 py-3 ${acceptMutation.isPending ? 'opacity-60' : ''}`}
        >
          <Feather name="flag" size={16} color="#fff" />
          <Text className="text-white font-semibold">{acceptMutation.isPending ? 'მიმდინარეობს...' : 'მისიის აღება'}</Text>
        </Pressable>
      ) : null}

      {/* Objectives */}
      <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-6 mb-1">
        ამოცანები · {completedCount}/{objectives.length}
        {quest.objective_order === 'ordered' ? ' · თანმიმდევრობით' : ''}
      </Text>
      <View>
        {objectives.map((objective, idx) => {
          const status = objective.progressStatus;
          const statusLabel = status ? OBJECTIVE_STATUS_LABELS[status] : null;
          const attemptable = isObjectiveAttemptable(objectives, quest.objective_order, objective.id);
          const isLocked = hasActiveUserQuest && !status && !attemptable;
          const isCompleted = status === 'completed';
          const canCapture = hasActiveUserQuest && attemptable && status !== 'pending_review' && status !== 'completed';

          return (
            <View key={objective.id} className={`flex-row items-start gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 ${isLocked ? 'opacity-50' : ''}`}>
              <View className={`w-6 h-6 rounded-full items-center justify-center mt-0.5 ${isCompleted ? 'bg-teal-600' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                {isCompleted ? (
                  <Feather name="check" size={13} color="#fff" />
                ) : isLocked ? (
                  <Feather name="lock" size={12} color="#a1a1aa" />
                ) : (
                  <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{idx + 1}</Text>
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  {objective.title ? <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{objective.title}</Text> : null}
                  {statusLabel ? <Text className="text-xs text-zinc-500 dark:text-zinc-400">· {statusLabel}</Text> : null}
                </View>
                <Text className="text-sm text-zinc-600 dark:text-zinc-300 mt-0.5">{objective.display_text}</Text>
                {status === 'rejected' && objective.rejectionReason ? (
                  <Text className="text-xs text-red-500 mt-1">მიზეზი: {objective.rejectionReason}</Text>
                ) : null}
              </View>
              {canCapture ? (
                <Pressable
                  onPress={() => setCaptureObjectiveId(objective.id)}
                  className="flex-row items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5"
                >
                  <Feather name="camera" size={13} color="#fff" />
                  <Text className="text-white text-xs font-medium">ფოტო</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Completed gallery */}
      {gallery.length > 0 ? (
        <View className="mt-6">
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">სხვების ნამუშევრები</Text>
          <View className="flex-row flex-wrap gap-2">
            {gallery.map((photo) => (
              <Image key={`${photo.userId}-${photo.objectiveId}`} source={{ uri: photo.photoUrl }} className="w-24 h-24 rounded-md bg-zinc-200 dark:bg-zinc-800" resizeMode="cover" />
            ))}
          </View>
        </View>
      ) : null}

      {captureObjective && userQuest ? (
        <QuestObjectiveCapture
          userQuestId={userQuest.id}
          objectiveId={captureObjective.id}
          type={captureObjective.type}
          config={captureObjective.config}
          onClose={() => setCaptureObjectiveId(null)}
          onSubmitted={() => {
            setCaptureObjectiveId(null);
            invalidateAfterCapture();
          }}
        />
      ) : null}
    </ScrollView>
  );
}
