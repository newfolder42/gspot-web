import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { zonesApi, type ZoneSettings } from '@/lib/zones';

const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

export function ManageTab({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['zone-settings', slug],
    queryFn: () => zonesApi.getSettings(slug),
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

  return <ManageEditor slug={slug} initial={data} />;
}

function ManageEditor({ slug, initial }: { slug: string; initial: ZoneSettings }) {
  const queryClient = useQueryClient();

  const [description, setDescription] = useState(initial.description);
  const [rulesText, setRulesText] = useState(initial.uploadRules.join('\n'));
  const [saving, setSaving] = useState(false);

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[4]);
  const [tagBusy, setTagBusy] = useState(false);
  const [tags, setTags] = useState<ZoneSettings['tags']>(initial.tags);

  async function saveSettings() {
    setSaving(true);
    try {
      const uploadRules = rulesText.split('\n').map((l) => l.trim()).filter(Boolean);
      await zonesApi.updateSettings(slug, { description, uploadRules });
      Alert.alert('შენახვა', 'წარმატებით განახლდა.');
      queryClient.invalidateQueries({ queryKey: ['zone-settings', slug] });
      queryClient.invalidateQueries({ queryKey: ['zone-meta', slug] });
    } catch {
      Alert.alert('შეცდომა', 'პარამეტრების შენახვა ვერ მოხერხდა.');
    } finally {
      setSaving(false);
    }
  }

  async function addTag() {
    const name = newTagName.trim();
    if (!name || tagBusy) return;
    setTagBusy(true);
    try {
      const res = await zonesApi.createTag(slug, name, newTagColor);
      setTags((prev) => [...prev, res.tag]);
      setNewTagName('');
    } catch {
      Alert.alert('შეცდომა', 'თეგი ვერ დაემატა (შესაძლოა უკვე არსებობს).');
    } finally {
      setTagBusy(false);
    }
  }

  async function removeTag(tagId: number) {
    try {
      await zonesApi.deleteTag(slug, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch {
      Alert.alert('შეცდომა', 'თეგი გამოყენებულია და ვერ წაიშლება.');
    }
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {/* Description */}
      <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">აღწერა</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="საბზონის აღწერა"
        placeholderTextColor="#71717A"
        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-base border border-zinc-200 dark:border-zinc-700 min-h-[80px]"
        style={{ textAlignVertical: 'top' }}
      />

      {/* Upload rules */}
      <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 mt-4">ატვირთვის წესები (თითო ხაზზე)</Text>
      <TextInput
        value={rulesText}
        onChangeText={setRulesText}
        multiline
        placeholder="თითო წესი ახალ ხაზზე"
        placeholderTextColor="#71717A"
        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-base border border-zinc-200 dark:border-zinc-700 min-h-[120px]"
        style={{ textAlignVertical: 'top' }}
      />

      <Pressable
        onPress={saveSettings}
        disabled={saving}
        className={`mt-4 rounded-xl bg-teal-600 py-3.5 items-center ${saving ? 'opacity-60' : ''}`}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">შენახვა</Text>}
      </Pressable>

      {/* Tags */}
      <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 mt-8">თეგები</Text>
      <View className="flex-row flex-wrap gap-2 mb-3">
        {tags.map((tag) => (
          <View
            key={tag.id}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ borderWidth: 1.5, borderColor: tag.color }}
          >
            <Text className="text-xs font-semibold" style={{ color: tag.color }}>{tag.name}</Text>
            <Pressable onPress={() => removeTag(tag.id)} hitSlop={6}>
              <Feather name="x" size={13} color={tag.color} />
            </Pressable>
          </View>
        ))}
        {tags.length === 0 ? <Text className="text-sm text-zinc-500 dark:text-zinc-400">თეგები არ არის</Text> : null}
      </View>

      <View className="flex-row gap-2 mb-2">
        {TAG_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setNewTagColor(c)}
            className={`h-7 w-7 rounded-full ${newTagColor === c ? 'border-2 border-zinc-900 dark:border-white' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </View>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder="ახალი თეგი"
          placeholderTextColor="#71717A"
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 text-base border border-zinc-200 dark:border-zinc-700"
        />
        <Pressable
          onPress={addTag}
          disabled={tagBusy}
          className={`h-[50px] w-[50px] rounded-xl bg-teal-600 items-center justify-center ${tagBusy ? 'opacity-60' : ''}`}
        >
          {tagBusy ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="plus" size={20} color="#fff" />}
        </Pressable>
      </View>
    </ScrollView>
  );
}
