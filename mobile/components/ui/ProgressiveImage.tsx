import { useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import type { ImageResizeMode, StyleProp, ViewStyle } from 'react-native';

/**
 * Two-stage image load: a small rendition paints straight away, the large one
 * fades over it once it has decoded.
 *
 * The server stores three renditions of every photo (see web
 * src/lib/image-pipeline.ts): `thumb` at 400px, `feed` at 1280px, and the
 * untouched master. React Native's <Image> has no placeholder of its own —
 * there is nothing on screen until the whole file has arrived — so a cold open
 * held an empty box for the entire download. Passing the next rendition down as
 * `placeholderUri` fills that gap for ~30 KB, which is usually a single round
 * trip.
 *
 * Both layers share `resizeMode` and the renditions share an aspect ratio, so
 * the frames line up exactly and the swap reads as the photo sharpening rather
 * than as a second image appearing.
 */

const FADE_MS = 180;

type Size = { width: number; height: number };

type Props = {
  /** The rendition this slot is meant to end up showing. */
  uri: string;
  /** Smaller rendition that holds the slot until `uri` lands. */
  placeholderUri?: string | null;
  className?: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  /** Pixel size of whichever layer decoded — the placeholder first, then `uri`. */
  onSize?: (size: Size) => void;
};

export function ProgressiveImage(props: Props) {
  // Lists recycle their rows, so a new source has to re-stage from the start.
  // Remounting is how that happens: unwinding a half-finished fade by hand is
  // what lets a recycled row flash the previous photo.
  return <ProgressiveImageLayers key={props.uri} {...props} />;
}

function ProgressiveImageLayers({
  uri,
  placeholderUri,
  className,
  style,
  resizeMode = 'cover',
  onSize,
}: Props) {
  // Staging only makes sense between two different files.
  const placeholder = placeholderUri && placeholderUri !== uri ? placeholderUri : null;

  const [opacity] = useState(() => new Animated.Value(placeholder ? 0 : 1));
  /** Unmounts the placeholder once it is fully covered, so it stops costing memory. */
  const [covered, setCovered] = useState(!placeholder);

  const readSize = (source: { width?: number; height?: number } | undefined) => {
    if (source?.width && source?.height) onSize?.({ width: source.width, height: source.height });
  };

  return (
    <View className={className} style={[style, { overflow: 'hidden' }]}>
      {covered || !placeholder ? null : (
        <Image
          source={{ uri: placeholder }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoad={(e) => readSize(e.nativeEvent.source)}
        />
      )}
      <Animated.Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode={resizeMode}
        onLoad={(e) => {
          readSize(e.nativeEvent.source);
          Animated.timing(opacity, {
            toValue: 1,
            duration: FADE_MS,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) setCovered(true);
          });
        }}
      />
    </View>
  );
}
