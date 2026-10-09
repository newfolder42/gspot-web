import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { JoinButton } from '@/components/zone/JoinButton';
import { ShareButton } from '@/components/ui/ShareButton';
import type { ZoneMeta } from '@/lib/zones';

export function ZoneHeader({ meta, slug }: { meta: ZoneMeta; slug: string }) {
  const [expanded, setExpanded] = useState(false);
  const { zone, membership } = meta;
  const description = zone.description?.trim() ?? '';
  const hasDescription = description.length > 0;
  const shouldTruncate = description.length > 100;
  const visibleDescription = expanded || !shouldTruncate ? description : `${description.slice(0, 100).trimEnd()}...`;

  return (
    <View>
      {/* Mirrors web zone-shell-header: banner with the avatar overlapping its bottom edge. */}
      <View className="h-28 bg-zinc-200 dark:bg-zinc-800">
        {zone.bannerUrl ? (
          <Image source={{ uri: zone.bannerUrl }} className="w-full h-full" resizeMode="cover" />
        ) : null}
      </View>

      <View className="px-4 pt-2 pb-2">
        {/* The padded wrapper matches the screen background, acting as web's ring around the avatar. */}
        <View className="absolute left-4 p-0.5 rounded-lg bg-zinc-50 dark:bg-zinc-950" style={{ top: -34 }}>
          <ProfileAvatar
            name={zone.slug}
            photoUrl={zone.profilePhotoUrl}
            size={64}
            shape="md"
            initialsClassName="text-2xl font-semibold text-white"
          />
        </View>

        <View style={{ paddingLeft: 80 }}>
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
              {zone.slug}
            </Text>
            <JoinButton
              slug={slug}
              status={membership?.status ?? null}
              role={membership?.role ?? null}
              joinPolicy={zone.joinPolicy}
            />
            <ShareButton path={`/zone/${slug}`} title={zone.name} size={18} />
          </View>
        </View>

        {hasDescription ? (
          <View className="mt-2" style={{ paddingLeft: 80 }}>
            <Text className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{visibleDescription}</Text>
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
