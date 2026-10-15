import { useEffect, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Easing, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { SideInsets } from '@/components/ui/SideInsets';
import { Colors, useTheme } from '@/constants/colors';
import { FORM_MAX_WIDTH, useLayout } from '@/lib/layout';
import type { OnboardingZone } from '@/lib/onboarding';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { WelcomeStep } from './WelcomeStep';
import { ZonesStep } from './ZonesStep';
import { ReadyStep } from './ReadyStep';

type Props = {
  alias: string;
  zones: OnboardingZone[];
  /** Records the flow as finished. Rejects when that could not be saved. */
  onFinish: () => Promise<void>;
};

type Step = { key: string; node: ReactNode };
type Direction = 'forward' | 'back';

/** Side padding every step and the footer share, on top of the centring gutter. */
const BASE_PADDING = 24;

/** How far a step travels while sliding in, and for how long. Matches web (globals.css). */
const STEP_SHIFT = 24;
const STEP_DURATION = 220;

const DOT_SIZE = 6;
const DOT_ACTIVE_WIDTH = 24;

/**
 * Slides and fades its content in when it mounts, from the side the step is reached from.
 * The flow keys it by step, so every move remounts it and replays the entrance. With no
 * direction (the opening step) or with reduced motion the content is simply there.
 *
 * Only the entrance is animated: the step being left disappears at once. That keeps the
 * two from overlapping, and the 220ms entrance is what reads as movement.
 */
function StepTransition({
  direction,
  reduceMotion,
  children,
}: {
  direction: Direction | null;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const animate = direction !== null && !reduceMotion;
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));

  useEffect(() => {
    if (!animate) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: STEP_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animate, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [direction === 'back' ? -STEP_SHIFT : STEP_SHIFT, 0],
  });

  return (
    <Animated.View style={{ flex: 1, opacity: progress, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

/** One progress dot: grows and takes the brand colour while its step is current. */
function Dot({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(active ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(active ? 1 : 0);
      return;
    }
    // Width and colour are layout/paint props, which the native driver cannot run.
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, reduceMotion, progress]);

  return (
    <Animated.View
      style={{
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        width: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [DOT_SIZE, DOT_ACTIVE_WIDTH],
        }),
        backgroundColor: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [theme.borderStrong, Colors.brand],
        }),
      }}
    />
  );
}

/**
 * First-run welcome flow. Rendered by the `(app)` layout in place of the app until the
 * user has finished it, so there is nothing to navigate back to underneath.
 *
 * Mirrors web components/onboarding/onboarding-flow.
 */
export function OnboardingFlow({ alias, zones: offeredZones, onFinish }: Props) {
  const { gutterFor } = useLayout();
  const padding = gutterFor(FORM_MAX_WIDTH) + BASE_PADDING;
  const reduceMotion = useReducedMotion();

  // Snapshot: joining takes a zone off the server's list, so a refetch mid-flow would
  // make the rows the user just joined vanish.
  const [zones] = useState(offeredZones);
  const [index, setIndex] = useState(0);
  // Which way the last move went; null until the first move, so the opening step is not
  // animated in.
  const [direction, setDirection] = useState<Direction | null>(null);
  const [joined, setJoined] = useState<ReadonlySet<string>>(() => new Set());
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // To add a page, drop a step in here. A step with nothing to show is left out rather
  // than rendered empty (no joinable zones left -> no zones step).
  const steps: Step[] = [
    { key: 'welcome', node: <WelcomeStep padding={padding} /> },
    ...(zones.length > 0
      ? [{
          key: 'zones',
          node: (
            <ZonesStep
              zones={zones}
              joined={joined}
              onJoined={(slug) => setJoined((prev) => new Set(prev).add(slug))}
              padding={padding}
              reduceMotion={reduceMotion}
            />
          ),
        }]
      : []),
    { key: 'ready', node: <ReadyStep alias={alias} padding={padding} /> },
  ];

  const isLast = index === steps.length - 1;

  function forward() {
    setDirection('forward');
    setIndex((i) => i + 1);
  }

  function back() {
    setDirection('back');
    setIndex((i) => i - 1);
  }

  // The system back button steps back through the flow; on the first step it is left to
  // exit the app as usual.
  useEffect(() => {
    if (index === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!finishing) {
        setDirection('back');
        setIndex((i) => i - 1);
      }
      return true;
    });
    return () => sub.remove();
  }, [index, finishing]);

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    setError(null);
    try {
      await onFinish();
      // On success the layout swaps this screen for the app.
    } catch {
      setError('ქსელის შეცდომა. შეამოწმე კავშირი.');
      setFinishing(false);
    }
  }

  return (
    <ScreenLayout>
      <SideInsets>
        <View className="flex-1">
          <View className="flex-1">
            <StepTransition
              key={steps[index].key}
              direction={direction}
              reduceMotion={reduceMotion}
            >
              {steps[index].node}
            </StepTransition>
          </View>

          <View style={{ paddingHorizontal: padding, paddingTop: 8, paddingBottom: 16 }}>
            {steps.length > 1 ? (
              <View className="flex-row justify-center gap-2 mb-4">
                {steps.map((step, i) => (
                  <Dot key={step.key} active={i === index} reduceMotion={reduceMotion} />
                ))}
              </View>
            ) : null}

            {error ? (
              <Text className="text-sm text-red-500 text-center mb-3">{error}</Text>
            ) : null}

            <View className="flex-row gap-3">
              {index > 0 ? (
                <View style={{ minWidth: 104 }}>
                  <Button title="← უკან" variant="secondary" onPress={back} disabled={finishing} />
                </View>
              ) : null}

              <View className="flex-1">
                <Button
                  title={isLast ? 'დაწყება' : 'გაგრძელება'}
                  onPress={isLast ? finish : forward}
                  loading={isLast && finishing}
                />
              </View>
            </View>
          </View>
        </View>
      </SideInsets>
    </ScreenLayout>
  );
}
