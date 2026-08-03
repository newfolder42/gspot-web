import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { postsApi } from '@/lib/posts';
import { submitApi, type ZoneTag } from '@/lib/submit';

type Props = {
  postId: number;
  zoneSlug: string;
  currentTitle: string;
  currentTagId: number | null;
  /** Quest posts have no editable tag (they carry no zone tag). */
  showTags?: boolean;
  onClose: () => void;
  onSaved: (changes: { title: string; tagId: number | null }) => void;
};

/** Mirrors the web PostActions edit modal — title plus zone tag, saved together. */
export function EditPostSheet({
  postId,
  zoneSlug,
  currentTitle,
  currentTagId,
  showTags = true,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(currentTitle ?? '');
  const [tagId, setTagId] = useState<number | null>(currentTagId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tags come from the post-zones endpoint (available to any member who can
  // post there), not zone settings — that one is manager-only.
  const { data: zones } = useQuery({
    queryKey: ['submit-zones'],
    queryFn: () => submitApi.loadZones(),
    enabled: showTags && !!zoneSlug,
    staleTime: 60_000,
  });

  const tags: ZoneTag[] = zones?.find((z) => z.slug === zoneSlug)?.tags ?? [];

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await postsApi.updatePost(postId, {
        title: trimmed,
        ...(tagId !== currentTagId ? { tagId } : {}),
      });
      onSaved({ title: trimmed, tagId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შენახვა ვერ მოხერხდა.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.7)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">რედაქტირება</Text>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
              <Feather name="x" size={15} color="#71717A" />
            </Pressable>
          </View>

          <View className="px-4 py-4">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="პოსტის სათაური"
              placeholderTextColor="#71717A"
              maxLength={500}
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-base border border-zinc-200 dark:border-zinc-700"
            />

            {showTags && tags.length > 0 ? (
              <>
                <Text className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  თეგი
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <Pressable
                    onPress={() => setTagId(null)}
                    className={`rounded-full px-3 py-1.5 border ${
                      tagId === null ? 'bg-zinc-800 border-zinc-800 dark:bg-zinc-200 dark:border-zinc-200' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        tagId === null ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      უთეგო
                    </Text>
                  </Pressable>
                  {tags.map((tag) => {
                    const active = tagId === tag.id;
                    return (
                      <Pressable
                        key={tag.id}
                        onPress={() => setTagId(tag.id)}
                        className="rounded-full px-3 py-1.5"
                        style={{
                          borderWidth: 1.5,
                          borderColor: tag.color,
                          backgroundColor: active ? tag.color : 'transparent',
                        }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: active ? '#fff' : tag.color }}>
                          {tag.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            {error ? <Text className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</Text> : null}

            <View className="flex-row gap-2 mt-5">
              <Pressable
                onPress={onClose}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">გაუქმება</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={saving || !title.trim()}
                className="flex-1 h-11 rounded-xl bg-teal-600 items-center justify-center"
                style={{ opacity: saving || !title.trim() ? 0.5 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">შენახვა</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
