import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { formatPhotoTakenDate } from '@/lib/dates';
import { useLayout } from '@/lib/layout';

type Size = { width: number; height: number };

type Props = {
  uri: string;
  /** Full-size source for the zoom viewer; passing it makes the photo zoomable. */
  fullUri?: string;
  title?: string | null;
  dateTaken?: string | null;
  /** Feed cards open the post on tap. */
  onPress?: () => void;
};

/**
 * A gps post's photo, laid out at its own aspect ratio instead of letterboxed in a
 * black full-width box. The frame hugs the photo and the screen background shows
 * around it, as on web, so the photo-taken stamp sits on the photo's corner.
 *
 * Upright it is at most 320 tall (the old h-80 slot); in landscape the window is
 * barely taller than that, so the cap becomes whatever fits under the header.
 */
export function PostPhoto(props: Props) {
  // A new photo has a new shape, so it starts measuring from scratch.
  return <PostPhotoFrame key={props.uri} {...props} />;
}

function PostPhotoFrame({ uri, fullUri, title, dateTaken, onPress }: Props) {
  const { width: windowWidth, photoMaxHeight } = useLayout();
  const [slotWidth, setSlotWidth] = useState(windowWidth);
  const [ratio, setRatio] = useState<number | null>(null);

  const handleSize = ({ width, height }: Size) => setRatio(width / height);

  // The shape is only known once the photo decodes; until then hold the full-width slot.
  const frameWidth = ratio ? Math.min(slotWidth, photoMaxHeight * ratio) : slotWidth;
  const frameHeight = ratio ? frameWidth / ratio : photoMaxHeight;

  return (
    <View className="w-full items-center" onLayout={(e) => setSlotWidth(e.nativeEvent.layout.width)}>
      <View
        style={{ width: frameWidth, height: frameHeight }}
        className={ratio ? undefined : 'bg-zinc-100 dark:bg-zinc-900'}
      >
        {fullUri ? (
          <ZoomableImage
            uri={uri}
            fullUri={fullUri}
            title={title}
            className="w-full h-full"
            resizeMode="contain"
            onSize={handleSize}
          />
        ) : (
          <Pressable onPress={onPress} className="w-full h-full">
            <ProgressiveImage uri={uri} className="w-full h-full" resizeMode="contain" onSize={handleSize} />
          </Pressable>
        )}
        {dateTaken && ratio ? (
          <View pointerEvents="none" className="absolute bottom-3 right-3">
            <Text className="text-sm text-amber-400" style={{ fontVariant: ['tabular-nums'], letterSpacing: 2 }}>
              {formatPhotoTakenDate(dateTaken)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
