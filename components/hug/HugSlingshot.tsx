import React, { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle, Line, Path } from "react-native-svg";

// 👇 fix this import to wherever your tokens live
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
} from "../../components/ui/squish/theme";

const AnimatedLine = Animated.createAnimatedComponent(Line);

export type HugPhase = "idle" | "hugging" | "formed" | "pulling" | "thrown";

export type HugSlingshotProps = {
  recipientName: string;
  /** Your avatar/character. Rendered inside the animated pocket, so it gets
   *  scaled by `inflate` and translated by `pull` for free. */
  projectile?: ReactNode;
  /** Fired once, the moment a throw with enough power is released. Do your
   *  Firebase write here. */
  onThrow?: (power: number) => void;
  /** Fired after the fly-off animation finishes. */
  onComplete?: () => void;
};

// --- tunables ---------------------------------------------------------------
const MAX_PULL = 220; // how far down you can stretch (px)
const MIN_POWER = 0.18; // below this on release → snap back, no throw
const PROJECTILE_SIZE = 160;
const INFLATE_MS = 1600;

export default function HugSlingshot({
  recipientName,
  projectile,
  onThrow,
  onComplete,
}: HugSlingshotProps) {
  const { width: W, height: H } = useWindowDimensions();

  // ---- geometry (all in the play-area coordinate space) --------------------
  const cx = W / 2;
  const forkY = H * 0.4;
  const forkSpread = Math.min(W * 0.3, 140);
  const FORK_L = { x: cx - forkSpread, y: forkY };
  const FORK_R = { x: cx + forkSpread, y: forkY };
  const junctionY = forkY + 110;
  const handleBottomY = junctionY + 150;
  const pocketRestY = forkY + 70; // avatar center at rest
  const LAUNCH_Y = -(forkY + 240); // negative pull = flies up and off

  // ---- animated state ------------------------------------------------------
  const inflate = useSharedValue(0); // 0 → 1, automatic grow
  const pull = useSharedValue(0); // px down (neg on launch)
  const bandsOpacity = useSharedValue(1);
  const pulling = useSharedValue(false);

  const [phase, setPhase] = useState<HugPhase>("idle");

  // ---- inflate (tap, no hold) ----------------------------------------------
  const startInflate = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("hugging");
    inflate.value = withTiming(
      1,
      { duration: INFLATE_MS, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(setPhase, "formed");
      },
    );
  }, [phase, inflate]);

  // ---- launch --------------------------------------------------------------
  const finishThrow = useCallback(() => {
    onComplete?.();
    // If this screen is reused rather than unmounted, reset here:
    // pull.value = 0; inflate.value = 0; bandsOpacity.value = 1; setPhase("idle");
  }, [onComplete]);

  const launch = useCallback(
    (power: number) => {
      setPhase("thrown");
      onThrow?.(power); // fire the Firebase write; animation plays meanwhile
      bandsOpacity.value = withTiming(0, { duration: 160 });
      const target = LAUNCH_Y * (0.7 + 0.3 * power);
      pull.value = withTiming(
        target,
        { duration: 620, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(finishThrow);
        },
      );
    },
    [LAUNCH_Y, onThrow, pull, bandsOpacity, finishThrow],
  );

  // ---- pull gesture --------------------------------------------------------
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(phase === "formed" || phase === "pulling")
        .onStart(() => {
          pulling.value = true;
          scheduleOnRN(setPhase, "pulling");
        })
        .onUpdate((e) => {
          if (!pulling.value) return;
          pull.value = Math.min(Math.max(e.translationY, 0), MAX_PULL);
        })
        .onEnd(() => {
          if (!pulling.value) return;
          pulling.value = false;
          const power = pull.value / MAX_PULL;
          if (power < MIN_POWER) {
            pull.value = withSpring(0, { damping: 16, stiffness: 140 });
            scheduleOnRN(setPhase, "formed");
          } else {
            scheduleOnRN(launch, power);
          }
        }),
    [phase, launch, pull, pulling],
  );

  // ---- derived visuals -----------------------------------------------------
  const leftBandProps = useAnimatedProps(() => ({
    x1: FORK_L.x,
    y1: FORK_L.y,
    x2: cx,
    y2: pocketRestY + pull.value,
    opacity: bandsOpacity.value,
  }));

  const rightBandProps = useAnimatedProps(() => ({
    x1: FORK_R.x,
    y1: FORK_R.y,
    x2: cx,
    y2: pocketRestY + pull.value,
    opacity: bandsOpacity.value,
  }));

  const projectileStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      inflate.value,
      [0, 1],
      [0.25, 1],
      Extrapolation.CLAMP,
    );
    const grow = interpolate(
      inflate.value,
      [0, 0.15, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );
    const fly = interpolate(
      pull.value,
      [LAUNCH_Y, LAUNCH_Y * 0.55, 0],
      [0, 1, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: grow * fly,
      transform: [{ translateY: pull.value }, { scale }],
    };
  });

  const cradleStyle = useAnimatedStyle(() => ({
    opacity:
      bandsOpacity.value *
      interpolate(inflate.value, [0, 0.4, 1], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ translateY: pull.value }],
  }));

  const bgStyle = useAnimatedStyle(() => {
    const t = Math.max(inflate.value, Math.max(pull.value, 0) / MAX_PULL);
    return {
      backgroundColor: interpolateColor(t, [0, 1], [colors.mistBg, "#FBEAF3"]),
    };
  });

  const powerFill = useAnimatedStyle(() => ({
    width: `${interpolate(pull.value, [0, MAX_PULL], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  // ---- copy ----------------------------------------------------------------
  const subtitle = {
    idle: "tap to load a hug",
    hugging: "filling up…",
    formed: "pull down & release",
    pulling: "let go!",
    thrown: "whee — off it goes!",
  }[phase];

  const showPower =
    phase === "formed" || phase === "pulling" || phase === "thrown";

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sling a hug to {recipientName}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.stage}>
          {/* frame + bands */}
          <Svg
            width={W}
            height={H}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {/* arms */}
            <Path
              d={`M ${FORK_L.x} ${FORK_L.y} Q ${cx} ${junctionY - 30} ${cx} ${junctionY}`}
              stroke={colors.lilac}
              strokeWidth={28}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={`M ${FORK_R.x} ${FORK_R.y} Q ${cx} ${junctionY - 30} ${cx} ${junctionY}`}
              stroke={colors.lilac}
              strokeWidth={28}
              strokeLinecap="round"
              fill="none"
            />
            {/* handle */}
            <Line
              x1={cx}
              y1={junctionY}
              x2={cx}
              y2={handleBottomY}
              stroke={colors.lilac}
              strokeWidth={28}
              strokeLinecap="round"
            />
            {/* fork knobs */}
            <Circle cx={FORK_L.x} cy={FORK_L.y} r={15} fill={colors.lilac} />
            <Circle cx={FORK_R.x} cy={FORK_R.y} r={15} fill={colors.lilac} />
            {/* rubber bands (behind the avatar, which sits on top) */}
            <AnimatedLine
              animatedProps={leftBandProps}
              stroke={colors.blush}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <AnimatedLine
              animatedProps={rightBandProps}
              stroke={colors.blush}
              strokeWidth={9}
              strokeLinecap="round"
            />
          </Svg>

          {/* pink cradle behind the avatar */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cradle,
              {
                left: cx - PROJECTILE_SIZE * 0.55,
                top: pocketRestY - PROJECTILE_SIZE * 0.1,
                width: PROJECTILE_SIZE * 1.1,
                height: PROJECTILE_SIZE * 0.7,
              },
              cradleStyle,
            ]}
          />

          {/* the avatar / projectile */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.projectile,
              {
                left: cx - PROJECTILE_SIZE / 2,
                top: pocketRestY - PROJECTILE_SIZE / 2,
                width: PROJECTILE_SIZE,
                height: PROJECTILE_SIZE,
              },
              projectileStyle,
            ]}
          >
            {projectile ?? <View style={styles.defaultBall} />}
          </Animated.View>
        </View>
      </GestureDetector>

      {/* footer: button in idle, power bar once loaded */}
      <View style={styles.footer}>
        {phase === "idle" && (
          <Pressable onPress={startInflate} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>send a hug</Text>
          </Pressable>
        )}
      </View>
      {showPower ? (
        <View
          style={{
            top: spacing.xl * 5,
            left: "10%",
            position: "absolute",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <View style={styles.powerPill}>
            <Text style={styles.powerLabel}>hug power</Text>
            <View style={styles.powerTrack}>
              <Animated.View style={[styles.powerFill, powerFill]} />
            </View>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingBottom: 120 },
  header: {
    paddingTop: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontFamily: font.displayBold,
    fontSize: 24,
    color: colors.plumInk,
  },
  subtitle: {
    fontFamily: font.hand,
    fontSize: 22,
    color: colors.primary,
  },
  stage: { flex: 1 },
  cradle: {
    position: "absolute",
    backgroundColor: colors.blush,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  projectile: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  defaultBall: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    minHeight: 96,
    justifyContent: "center",
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: radius.pill,
    ...shadow,
  },
  sendBtnText: {
    fontFamily: font.uiBold,
    fontSize: 18,
    color: colors.surface,
  },
  powerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    ...shadow,
  },
  powerLabel: {
    fontFamily: font.uiBold,
    fontSize: 15,
    color: colors.plumInk,
  },
  powerTrack: {
    width: 160,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.soft,
    overflow: "hidden",
  },
  powerFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});
