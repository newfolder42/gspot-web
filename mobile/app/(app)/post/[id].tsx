import { useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionSheetIOS, ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { TagBadge } from '@/components/ui/TagBadge';
import { postsApi } from '@/lib/posts';
import { useAuth } from '@/contexts/AuthContext';
import type { PostCommentType } from '@/types/post-comment';
import { getInitials } from '@/lib/getInitials';
import { NewGuess } from '@/components/NewGuess';
import type { GuessResult } from '@/types/post-guess';

/** Matches web DEPTH_COLORS cycle */
const DEPTH_BORDER_COLORS = [
  '#14B8A6', // teal-500
  '#60A5FA', // blue-400
  '#A78BFA', // violet-400
  '#F87171', // rose-400
  '#FBBF24', // amber-400
];

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'ახლახანს';
  if (minutes < 60) return `${minutes} წუთის წინ`;
  if (hours < 24) return `${hours} საათის წინ`;
  return `${days} დღის წინ`;
}

function countComments(items: PostCommentType[]): number {
  return items.reduce((acc, c) => acc + (c.type === 'comment' ? 1 : 0) + countComments(c.children), 0);
}

function addCommentToTree(
  items: PostCommentType[],
  newComment: PostCommentType,
  parentId: number | null
): PostCommentType[] {
  if (!parentId) {
    return [{ ...newComment, children: [] }, ...items];
  }

  return items.map((item) => {
    if (item.id === parentId) {
      return {
        ...item,
        children: [{ ...newComment, children: [] }, ...item.children],
      };
    }

    if (!item.children.length) return item;
    return {
      ...item,
      children: addCommentToTree(item.children, newComment, parentId),
    };
  });
}

function CommentItem({
  item,
  depth = 0,
  onReply,
}: {
  item: PostCommentType;
  depth?: number;
  onReply: (comment: PostCommentType) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const marginLeft = Math.min(depth * 14, 42);
  const borderColor = DEPTH_BORDER_COLORS[depth % DEPTH_BORDER_COLORS.length];
  const initials = getInitials(item.author) || (item.author || '?').slice(0, 2).toUpperCase();

  const isGuess = item.type === 'gps-guess-comment' || item.type === 'gps-photo-guess-comment';
  const isPhotoGuess = item.type === 'gps-photo-guess-comment';

  const collapsedPreview = isGuess
    ? [
        item.metadata?.score != null ? String(item.metadata.score) : null,
        item.metadata?.distance != null ? `${item.metadata.distance.toLocaleString('ka-GE')} მ` : null,
      ].filter(Boolean).join(' • ') || (isPhotoGuess ? 'ფოტო-გამოცნობა' : 'გამოცნობა')
    : (item.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'კომენტარი';

  const wrapper = depth > 0
    ? { marginLeft, borderLeftWidth: 2, borderLeftColor: borderColor, paddingLeft: 10 }
    : {};

  return (
    <View style={wrapper} className="py-2">
      {/* Author row */}
      <View className="flex-row items-center gap-1.5 mb-1 flex-wrap">
        <Pressable
          onPress={() => setCollapsed((v) => !v)}
          className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 items-center justify-center flex-shrink-0"
        >
          <Text className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{initials}</Text>
        </Pressable>
        <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">&apos;{item.author}</Text>
        {item.authorLevel != null ? <LevelBadge level={item.authorLevel} /> : null}
        {isGuess ? (
          <Feather name={isPhotoGuess ? 'camera' : 'map-pin'} size={11} color="#14B8A6" />
        ) : null}
        <Text className="text-xs text-zinc-400">•</Text>
        <Text className="text-xs text-zinc-400">{formatTimeAgo(item.createdAt)}</Text>
        {collapsed ? (
          <Text className="text-xs text-zinc-400" numberOfLines={1}>• {collapsedPreview}</Text>
        ) : null}
      </View>

      {!collapsed ? (
        <>
          {/* Body */}
          {isGuess ? (
            <View className="mb-1">
              {isPhotoGuess && item.metadata?.imageUrl ? (
                <View className="w-44 h-32 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 mb-1.5">
                  <Image
                    source={{ uri: item.metadata.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
              <View className="flex-row items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 rounded px-2 py-1.5 self-start">
                {item.metadata?.score != null ? (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">ქულა </Text>
                    <Text className="text-sm font-semibold text-teal-600 dark:text-teal-400">{item.metadata.score}</Text>
                  </View>
                ) : null}
                {item.metadata?.distance != null ? (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">მანძილი </Text>
                    <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.metadata.distance.toLocaleString('ka-GE')} მ</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <Text className="text-sm text-zinc-800 dark:text-zinc-200 leading-5 mb-1">{item.body}</Text>
          )}

          {/* Reply button – all comment types */}
          <Pressable onPress={() => onReply(item)} className="self-start mt-0.5">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">↩ პასუხი</Text>
          </Pressable>
        </>
      ) : null}

      {/* Children */}
      {!collapsed
        ? item.children.map((child) => (
            <CommentItem key={child.id} item={child} depth={depth + 1} onReply={onReply} />
          ))
        : null}
    </View>
  );
}

export default function PostPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [commentBody, setCommentBody] = useState('');
  const [replyTo, setReplyTo] = useState<PostCommentType | null>(null);
  const [showGuess, setShowGuess] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleReply = (comment: PostCommentType) => {
    setReplyTo(comment);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleGuessSubmitted = (_result: GuessResult) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        alreadyGuessed: true,
        post: {
          ...old.post,
          guessCount: (old.post.guessCount ?? 0) + 1,
        },
      };
    });
  };

  const queryKey = useMemo(() => ['post-detail', postId] as const, [postId]);

  const query = useQuery({
    queryKey,
    queryFn: () => postsApi.getPostDetail(postId),
    enabled: Number.isFinite(postId) && postId > 0,
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => postsApi.addComment(postId, commentBody.trim(), replyTo?.id ?? null),
    onSuccess: (newComment) => {
      setCommentBody('');
      setReplyTo(null);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        const prev = old.comments as PostCommentType[];
        return {
          ...old,
          comments: addCommentToTree(prev, newComment, replyTo?.id ?? null),
        };
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => postsApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-feed'] });
      router.back();
    },
    onError: () => Alert.alert('შეცდომა', 'პოსტის წაშლა ვერ მოხერხდა'),
  });

  const handleDeletePress = () => {
    Alert.alert(
      'პოსტის წაშლა',
      'დარწმუნებული ხარ, რომ გსურს ამ პოსტის წაშლა?',
      [
        { text: 'გაუქმება', style: 'cancel' },
        { text: 'წაშლა', style: 'destructive', onPress: () => deletePostMutation.mutate() },
      ]
    );
  };

  const handlePostOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['გაუქმება', 'პოსტის წაშლა'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
        },
        (index) => {
          if (index === 1) handleDeletePress();
        }
      );
    } else {
      handleDeletePress();
    }
  };

  if (!Number.isFinite(postId) || postId <= 0) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-8">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">პოსტის ID არასწორია</Text>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-zinc-50 dark:bg-zinc-950">
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center mb-4">პოსტის ჩატვირთვა ვერ მოხერხდა</Text>
        <Pressable onPress={() => query.refetch()} className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Text className="text-brand text-sm font-semibold">ხელახლა ცდა</Text>
        </Pressable>
      </View>
    );
  }

  const { post, comments, alreadyGuessed } = query.data;
  const commentsCount = countComments(comments);
  const isOwner = user?.id != null && Number(post.userId) === Number(user.id);
  const canGuess = post.type === 'gps-photo' && !alreadyGuessed && !isOwner;
  const isQuest = post.type === 'quest-completion';
  const questPhotos = post.photos ?? [];
  const questTitle = post.questTitle ? `შეასრულა მისია ${post.questTitle}` : 'შეასრულა მისია';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-zinc-50 dark:bg-zinc-950"
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header – mirrors web PostDetailClient flex items-start p-2 ── */}
        <View className="p-2">
          <View className="flex-row items-start">
            <View className="flex-1 flex-row items-center gap-1.5 flex-wrap">
              {/* Zone avatar + slug – tappable */}
              <Pressable
                className="flex-row items-center gap-1.5"
                onPress={() => router.push({ pathname: '/(app)/zone/[slug]', params: { slug: post.zoneSlug ?? '' } })}
              >
                <ProfileAvatar name={post.zoneSlug ?? ''} photoUrl={post.zoneProfilePhoto} size={24} shape="md" />
                <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{post.zoneSlug}</Text>
              </Pressable>
              <Text className="text-xs text-zinc-400">•</Text>
              {/* Author + level – tappable */}
              <Pressable
                className="flex-row items-center gap-1"
                onPress={() => router.push({ pathname: '/(app)/user/[alias]', params: { alias: post.author } })}
              >
                <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">&apos;{post.author}</Text>
                {post.authorLevel != null ? <LevelBadge level={post.authorLevel} /> : null}
              </Pressable>
              <Text className="text-xs text-zinc-400">•</Text>
              <Text className="text-xs text-zinc-400">{formatTimeAgo(post.date)}</Text>
              {post.status === 'failed' ? (
                <View className="w-3 h-3 rounded-full bg-rose-600" />
              ) : null}
            </View>
            {/* Three-dots options menu – shown to owner */}
            {isOwner ? (
              <Pressable
                onPress={handlePostOptions}
                disabled={deletePostMutation.isPending}
                hitSlop={10}
                className="ml-2 p-1"
              >
                <Feather name="more-horizontal" size={18} color="#71717A" />
              </Pressable>
            ) : null}
          </View>

          {isQuest ? (
            /* Quest title – teal link → zone quest detail */
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/zone/[slug]/quests/[questId]',
                  params: { slug: post.zoneSlug ?? '', questId: String(post.questId ?? '') },
                })
              }
            >
              <Text className="mt-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400">
                {questTitle}
              </Text>
            </Pressable>
          ) : (
            <>
              {/* Tag – solid colour, white text */}
              {post.tag ? <TagBadge name={post.tag.name} color={post.tag.color} /> : null}
              {/* Title */}
              {post.title ? (
                <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{post.title}</Text>
              ) : null}
            </>
          )}
        </View>

        {/* ── Media block with counter overlay ── */}
        {isQuest ? (
          questPhotos.length > 0 ? (
            <View className="relative">
              <View className="flex-row flex-wrap">
                {questPhotos.map((photo, idx) => (
                  <View
                    key={idx}
                    style={{ width: questPhotos.length === 1 ? '100%' : '50%', aspectRatio: 1, padding: 1 }}
                  >
                    <View className="flex-1 relative bg-zinc-100 dark:bg-zinc-900">
                      <Image
                        source={{ uri: photo.variants?.feed ?? photo.url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {photo.objectiveTitle ? (
                        <View className="absolute bottom-0 inset-x-0 px-2 pt-4 pb-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                          <Text className="text-xs font-medium text-white" numberOfLines={1}>{photo.objectiveTitle}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
              <View
                className="absolute top-3 right-3 flex-row items-center gap-1 rounded-full px-2.5 py-1 border border-white/20"
                style={{ backgroundColor: 'rgba(24,24,27,0.8)' }}
              >
                <Feather name="message-circle" size={16} color="#FAFAFA" />
                <Text className="text-sm font-semibold text-zinc-50">{commentsCount}</Text>
              </View>
            </View>
          ) : null
        ) : post.image ? (
          <View className="relative bg-black">
            <Image source={{ uri: post.image }} className="w-full h-80" resizeMode="contain" />
            <View
              className="absolute top-3 right-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1 border border-white/20"
              style={{ backgroundColor: 'rgba(24,24,27,0.8)' }}
            >
              <Feather name="map-pin" size={16} color="#FAFAFA" />
              <Text className="text-sm font-semibold text-zinc-50">{post.guessCount ?? 0}</Text>
              <View className="flex-row items-center gap-1 ml-2">
                <Feather name="message-circle" size={16} color="#FAFAFA" />
                <Text className="text-sm font-semibold text-zinc-50">{commentsCount}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Guess button ── */}
        {canGuess ? (
          <View className="px-4 pt-3">
            <Pressable
              onPress={() => setShowGuess(true)}
              className="h-11 rounded-xl bg-teal-600 flex-row items-center justify-center gap-2 active:opacity-80"
            >
              <Feather name="map-pin" size={16} color="#fff" />
              <Text className="text-sm font-semibold text-white">გამოიცანი</Text>
            </Pressable>
          </View>
        ) : alreadyGuessed ? (
          <View className="px-4 pt-3">
            <View className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex-row items-center justify-center gap-2">
              <Feather name="check-circle" size={16} color="#14B8A6" />
              <Text className="text-sm font-semibold text-teal-600 dark:text-teal-400">გამოცნობილია</Text>
            </View>
          </View>
        ) : null}

        {/* ── Comments ── */}
        <View className="px-4 pt-4">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">კომენტარები</Text>
          {comments.length === 0 ? (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">ჯერ კომენტარი არ არის</Text>
          ) : (
            comments.map((comment) => <CommentItem key={comment.id} item={comment} onReply={handleReply} />)
          )}
        </View>
      </ScrollView>

      {/* ── Sticky bottom comment input – floats above the keyboard ── */}
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800" style={{ paddingBottom: insets.bottom }}>
        {replyTo ? (
          <View className="px-3 pt-2 flex-row items-center justify-between">
            <Text className="text-xs text-teal-700 dark:text-teal-300 flex-1 mr-2" numberOfLines={1}>
              ↩ პასუხობ &apos;{replyTo.author}-ს
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Feather name="x" size={14} color="#14B8A6" />
            </Pressable>
          </View>
        ) : null}
        <View className="flex-row items-end gap-2 px-3 py-2">
          <TextInput
            ref={inputRef}
            value={commentBody}
            onChangeText={setCommentBody}
            placeholder={replyTo ? 'დაწერე პასუხი...' : 'დაწერე კომენტარი...'}
            placeholderTextColor="#71717A"
            multiline
            maxLength={2000}
            className="text-zinc-900 dark:text-zinc-50"
            style={{
              flex: 1,
              maxHeight: 96,
              backgroundColor: 'transparent',
              fontSize: 14,
              lineHeight: 20,
              paddingVertical: 8,
            }}
          />
          <Pressable
            onPress={() => addCommentMutation.mutate()}
            disabled={!commentBody.trim() || addCommentMutation.isPending}
            className="mb-1 w-9 h-9 rounded-full bg-teal-600 items-center justify-center"
            style={{ opacity: !commentBody.trim() || addCommentMutation.isPending ? 0.4 : 1 }}
          >
            {addCommentMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="send" size={16} color="#fff" />}
          </Pressable>
        </View>
        </View>
      </KeyboardStickyView>
      {showGuess ? (
        <NewGuess
          post={post}
          onClose={() => setShowGuess(false)}
          onSubmitted={handleGuessSubmitted}
        />
      ) : null}
    </View>
  );
}
