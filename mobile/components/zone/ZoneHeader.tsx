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
    <View className="bg-white dark:bg-zinc-900">
      {/* Banner, Reddit-style: no avatar overlap. */}
      <View className="h-28 bg-zinc-200 dark:bg-zinc-800">
        {zone.bannerUrl ? (
          <Image source={{ uri: zone.bannerUrl }} className="w-full h-full" resizeMode="cover" />
        ) : null}
      </View>

      <View className="px-4 pt-3 pb-4">
        <View className="flex-row items-center gap-2.5">
          <ProfileAvatar name={zone.slug} photoUrl={zone.profilePhotoUrl} size={40} shape="md" />
          <Text className="flex-1 text-lg font-bold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
            {zone.slug}
          </Text>
          <JoinButton
            slug={slug}
            status={membership?.status ?? null}
            role={membership?.role ?? null}
            joinPolicy={zone.joinPolicy}
          />
        </View>

        {hasDescription ? (
          <View className="mt-2.5">
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
