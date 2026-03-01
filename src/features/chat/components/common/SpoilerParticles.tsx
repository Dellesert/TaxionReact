import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParticleDescriptor {
  id: number;
  baseXPct: number;
  baseYPct: number;
  amplitudeX: number;
  amplitudeY: number;
  phase: number;
  phaseY: number;
  speed: number;
  flickerSpeed: number;
  flickerPhase: number;
  minOpacity: number;
  maxOpacity: number;
  size: number;
}

interface SpoilerParticlesProps {
  revealProgress: SharedValue<number>;
  particleColor: string;
  containerWidth: number;
  containerHeight: number;
}

interface ParticleProps {
  descriptor: ParticleDescriptor;
  clock: SharedValue<number>;
  revealProgress: SharedValue<number>;
  particleColor: string;
  containerWidth: number;
  containerHeight: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID_SIZE = 10;
const CLOCK_DURATION = 5000;
const TWO_PI = 3   * Math.PI;

// ─── Particle generation ─────────────────────────────────────────────────────

function generateParticles(): ParticleDescriptor[] {
  const particles: ParticleDescriptor[] = [];
  let id = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellX = (col + 0.5) / GRID_SIZE;
      const cellY = (row + 0.5) / GRID_SIZE;
      // Jitter ±30% of cell size
      const jitter = 0.3 / GRID_SIZE;
      const baseXPct = cellX + (Math.random() * 2 - 1) * jitter;
      const baseYPct = cellY + (Math.random() * 2 - 1) * jitter;

      particles.push({
        id: id++,
        baseXPct: Math.max(0.05, Math.min(0.95, baseXPct)),
        baseYPct: Math.max(0.05, Math.min(0.95, baseYPct)),
        amplitudeX: 3 + Math.random() * 5,
        amplitudeY: 3 + Math.random() * 5,
        phase: Math.random(),
        phaseY: Math.random(),
        speed: 0.5 + Math.random(),
        flickerSpeed: 1 + Math.random() * 2,
        flickerPhase: Math.random(),
        minOpacity: 0.15 + Math.random() * 0.25,
        maxOpacity: 0.6 + Math.random() * 0.4,
        size: 2 + Math.random() * 2,
      });
    }
  }

  return particles;
}

// ─── Single Particle ─────────────────────────────────────────────────────────

const Particle: React.FC<ParticleProps> = React.memo(({
  descriptor,
  clock,
  revealProgress,
  particleColor,
  containerWidth,
  containerHeight,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const t = clock.value;
    const reveal = revealProgress.value;

    const x =
      descriptor.baseXPct * containerWidth +
      descriptor.amplitudeX * Math.sin(TWO_PI * (t * descriptor.speed + descriptor.phase));
    const y =
      descriptor.baseYPct * containerHeight +
      descriptor.amplitudeY * Math.cos(TWO_PI * (t * descriptor.speed + descriptor.phaseY));

    const flickerValue =
      0.5 + 0.5 * Math.sin(TWO_PI * (t * descriptor.flickerSpeed + descriptor.flickerPhase));
    const baseOpacity =
      descriptor.minOpacity + (descriptor.maxOpacity - descriptor.minOpacity) * flickerValue;

    const scale = 1 + reveal * 1.5;
    const opacity = baseOpacity * (1 - reveal);

    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: descriptor.size,
          height: descriptor.size,
          borderRadius: descriptor.size / 2,
          backgroundColor: particleColor,
        },
        animatedStyle,
      ]}
    />
  );
});

// ─── SpoilerParticles ────────────────────────────────────────────────────────

export const SpoilerParticles: React.FC<SpoilerParticlesProps> = ({
  revealProgress,
  particleColor,
  containerWidth,
  containerHeight,
}) => {
  const clock = useSharedValue(0);
  const particles = useMemo(() => generateParticles(), []);

  useEffect(() => {
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: CLOCK_DURATION, easing: Easing.linear }),
      -1,
      false,
    );
  }, [clock]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <Particle
          key={p.id}
          descriptor={p}
          clock={clock}
          revealProgress={revealProgress}
          particleColor={particleColor}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
