import { useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

/**
 * Mobile counterpart of the web's `ZoomableImage`. On the web a click zooms the
 * photo 2.5× around the clicked point; on a phone the same job is done with
 * pinch and double-tap, so this file ships three pieces:
 *
 *   PinchZoomImage   the gesture surface — pinch, drag while zoomed, double-tap
 *   ImageZoomViewer  a full-screen black modal wrapped around PinchZoomImage
 *   ZoomableImage    drop-in replacement for `<Image>` at the call sites where
 *                    web uses `<ZoomableImage>`: renders the thumbnail and
 *                    opens the viewer on tap
 *
 * Gestures are built on PanResponder rather than react-native-gesture-handler:
 * the latter is only present transitively (an expo-router peer) at a version
 * Expo 56 does not bundle, so relying on it would mean a native rebuild.
 *
 * PinchZoomImage claims the touch responder, so keep it out of scrollable
 * containers — use ZoomableImage there and zoom inside the viewer instead.
 */

/** Matches the web's ZOOM_SCALE, so a double-tap lands where a click would. */
const DOUBLE_TAP_SCALE = 2.5;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DOUBLE_TAP_MS = 280;
const TAP_SLOP = 10;

type Size = { width: number; height: number };
type Point = { x: number; y: number };
type ResizeMode = 'contain' | 'cover';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * All gesture bookkeeping lives in one closure created once per mounted image:
 * every value here is written from touch handlers, never from rendering.
 */
function createZoomController(resizeMode: ResizeMode) {
  const animated = {
    scale: new Animated.Value(MIN_SCALE),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
  };

  /** Window position of the view, so page-based touches can be made local. */
  let origin: Point = { x: 0, y: 0 };
  let layout: Size = { width: 0, height: 0 };
  /** Pixel size of the source image, needed to know where its edges are. */
  let natural: Size | null = null;

  // Mirror of the animated values, since Animated.Value has no sync getter.
  let current = { scale: MIN_SCALE, x: 0, y: 0 };
  let pinch: { dist: number; focal: Point; scale: number; x: number; y: number } | null = null;
  let pan: { x: number; y: number; tx: number; ty: number } | null = null;
  let moved = false;
  let lastTap = 0;

  /** Touch position relative to the centre of the view, in screen units. */
  const toLocal = (pageX: number, pageY: number): Point => ({
    x: pageX - origin.x - layout.width / 2,
    y: pageY - origin.y - layout.height / 2,
  });

  /**
   * How far the photo may be dragged at a given scale. The image is laid out by
   * resizeMode, so letterboxed margins must not become draggable slack.
   */
  const boundsFor = (scale: number): Point => {
    const { width: W, height: H } = layout;
    let w = W;
    let h = H;
    if (natural && natural.width > 0 && natural.height > 0 && W > 0 && H > 0) {
      const fit =
        resizeMode === 'cover'
          ? Math.max(W / natural.width, H / natural.height)
          : Math.min(W / natural.width, H / natural.height);
      w = natural.width * fit;
      h = natural.height * fit;
    }
    return {
      x: Math.max(0, (w * scale - W) / 2),
      y: Math.max(0, (h * scale - H) / 2),
    };
  };

  const commit = (scale: number, x: number, y: number, animate: boolean) => {
    const bounds = boundsFor(scale);
    const cx = clamp(x, -bounds.x, bounds.x);
    const cy = clamp(y, -bounds.y, bounds.y);
    current = { scale, x: cx, y: cy };

    if (!animate) {
      animated.scale.setValue(scale);
      animated.translateX.setValue(cx);
      animated.translateY.setValue(cy);
      return;
    }

    Animated.parallel([
      Animated.timing(animated.scale, { toValue: scale, duration: 180, useNativeDriver: false }),
      Animated.timing(animated.translateX, { toValue: cx, duration: 180, useNativeDriver: false }),
      Animated.timing(animated.translateY, { toValue: cy, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: (e) => e.nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponder: (e) =>
      e.nativeEvent.touches.length >= 2 || current.scale > MIN_SCALE,
    onMoveShouldSetPanResponderCapture: (e) => e.nativeEvent.touches.length >= 2,
    // Nothing else should take over mid-pinch; this view owns its own area.
    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: () => {
      moved = false;
      pinch = null;
      pan = null;
      // A double-tap animation may still be in flight; freeze it where it is so
      // the next gesture starts from what is on screen rather than the target.
      animated.scale.stopAnimation((value) => {
        current.scale = value;
      });
      animated.translateX.stopAnimation((value) => {
        current.x = value;
      });
      animated.translateY.stopAnimation((value) => {
        current.y = value;
      });
    },

    onPanResponderMove: (e) => {
      const touches = e.nativeEvent.touches;

      if (touches.length >= 2) {
        pan = null;
        const [a, b] = touches;
        const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        const focal = toLocal((a.pageX + b.pageX) / 2, (a.pageY + b.pageY) / 2);

        if (!pinch) {
          pinch = { dist: dist || 1, focal, scale: current.scale, x: current.x, y: current.y };
          return;
        }

        const next = clamp((pinch.scale * dist) / pinch.dist, MIN_SCALE, MAX_SCALE);
        const ratio = next / pinch.scale;
        // Whatever sat under the fingers stays under them as they spread and drift.
        commit(
          next,
          focal.x - ratio * (pinch.focal.x - pinch.x),
          focal.y - ratio * (pinch.focal.y - pinch.y),
          false
        );
        moved = true;
        return;
      }

      pinch = null;
      if (current.scale <= MIN_SCALE) return;

      const touch = touches[0];
      if (!touch) return;
      if (!pan) {
        pan = { x: touch.pageX, y: touch.pageY, tx: current.x, ty: current.y };
        return;
      }
      const dx = touch.pageX - pan.x;
      const dy = touch.pageY - pan.y;
      if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) moved = true;
      commit(current.scale, pan.tx + dx, pan.ty + dy, false);
    },

    onPanResponderRelease: (e) => {
      const wasTap = !moved;
      pinch = null;
      pan = null;
      if (!wasTap) return;

      // The event's own clock, so nothing impure is called from a handler the
      // React Compiler cannot tell apart from render.
      const now = e.nativeEvent.timestamp;
      if (now - lastTap < DOUBLE_TAP_MS) {
        lastTap = 0;
        if (current.scale > MIN_SCALE) {
          commit(MIN_SCALE, 0, 0, true);
        } else {
          const focal = toLocal(e.nativeEvent.pageX, e.nativeEvent.pageY);
          commit(
            DOUBLE_TAP_SCALE,
            focal.x * (1 - DOUBLE_TAP_SCALE),
            focal.y * (1 - DOUBLE_TAP_SCALE),
            true
          );
        }
      } else {
        lastTap = now;
      }
    },

    onPanResponderTerminate: () => {
      pinch = null;
      pan = null;
    },
  });

  return {
    animated,
    panResponder,
    setLayout: (size: Size) => {
      layout = { width: size.width, height: size.height };
    },
    setOrigin: (point: Point) => {
      origin = point;
    },
    setNatural: (size: Size) => {
      natural = size;
    },
  };
}

export function PinchZoomImage({
  uri,
  style,
  /** Fixed for the lifetime of the image — the controller captures it. */
  resizeMode = 'contain',
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ResizeMode;
}) {
  const [zoom] = useState(() => createZoomController(resizeMode));
  const containerRef = useRef<View>(null);

  return (
    <View
      ref={containerRef}
      // Android drops layout-only views, which would break measureInWindow.
      collapsable={false}
      style={[{ overflow: 'hidden' }, style]}
      onLayout={(e) => {
        zoom.setLayout(e.nativeEvent.layout);
        // Touches arrive in window coordinates, so the gestures need to know
        // where this view sits. It only moves when it re-lays out.
        containerRef.current?.measureInWindow((x, y) => zoom.setOrigin({ x, y }));
      }}
      {...zoom.panResponder.panHandlers}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: [
            { translateX: zoom.animated.translateX },
            { translateY: zoom.animated.translateY },
            { scale: zoom.animated.scale },
          ],
        }}
      >
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={resizeMode}
          onLoad={(e) => {
            const source = e.nativeEvent.source;
            if (source?.width && source?.height) {
              zoom.setNatural({ width: source.width, height: source.height });
            }
          }}
        />
      </Animated.View>
    </View>
  );
}

export function ImageZoomViewer({
  uri,
  title,
  onClose,
}: {
  uri: string;
  title?: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <PinchZoomImage uri={uri} style={{ flex: 1 }} resizeMode="contain" />

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 8,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {title ? (
            <View className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900/80">
              <Text className="text-sm font-semibold text-zinc-100" numberOfLines={1}>
                {title}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable onPress={onClose} hitSlop={10} className="p-2 rounded-lg bg-zinc-900/80">
            <Feather name="x" size={18} color="#E4E4E7" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function ZoomableImage({
  uri,
  fullUri,
  title,
  className,
  style,
  resizeMode = 'cover',
  children,
}: {
  uri: string;
  /** Full-size source for the viewer, when the inline one is a thumbnail. */
  fullUri?: string;
  title?: string | null;
  className?: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ResizeMode;
  /** Overlays drawn on top of the thumbnail; give them pointerEvents="none". */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable className={className} style={style} onPress={() => setOpen(true)}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode={resizeMode} />
        {children}
      </Pressable>
      {open ? (
        <ImageZoomViewer uri={fullUri ?? uri} title={title} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
