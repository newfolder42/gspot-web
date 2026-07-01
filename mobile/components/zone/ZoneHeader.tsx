import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { JoinButton } from '@/components/zone/JoinButton';
import type { ZoneMeta } from '@/lib/zones';

export function ZoneHeader({ meta, slug }: { meta: ZoneMeta; slug: string }) {
  const [expanded, setExpanded] = useState(false);
  const { zone, membership } = meta;
  const description = zone.description?.trim() ?? '';
  const hasDescription = description.length > 0;
  const shouldTruncate = description.length > 100;
  const visibleDescription = expanded || !shouldTruncate ? description : `${description.slice(0, 100).trimEnd()}...`;

  return (
    <View className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      {/* Banner */}
      <View className="h-24 bg-zinc-200 dark:bg-zinc-800">
        {zone.bannerUrl ? (
          <Image source={{ uri: zone.bannerUrl }} className="w-full h-full" resizeMode="cover" />
        ) : null}
      </View>

      <View className="px-4 pb-3">
        <View className="flex-row items-end justify-between -mt-8">
          <View className="rounded-md border-2 border-white dark:border-zinc-900">
            <ProfileAvatar name={zone.slug} photoUrl={zone.profilePhotoUrl} size={64} shape="md" />
          </View>
          <View className="mb-1">
            <JoinButton
              slug={slug}
              status={membership?.status ?? null}
              role={membership?.role ?? null}
              joinPolicy={zone.joinPolicy}
            />
          </View>
        </View>

        <Text className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">{zone.slug}</Text>
        {hasDescription ? (
          <View className="mt-1">
            <Text className="text-sm text-zinc-600 dark:text-zinc-300">{visibleDescription}</Text>
            {shouldTruncate ? (
              <Pressable onPress={() => setExpanded((p) => !p)}>
                <Text className="mt-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                  {expanded ? 'ნაკლები' : 'მეტი'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
