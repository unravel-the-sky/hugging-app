import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, spacing } from "./squish";
import { PlushButton } from "./squish/PlushButton";
import { APP_NAME } from "@/constants";

export interface OfflineScreenProps {
  /** Re-checks connectivity. May be async — the button shows a pending state. */
  onRetry?: () => void | Promise<void>;
  title?: string;
  message?: string;
  /** Handwritten reassurance line at the bottom. Pass null to hide it. */
  caption?: string | null;
}

/** Diameter of the outermost glow ring. */
const HALO = 184;
/** Keep the pending state visible at least this long — NetInfo.refresh()
 *  often resolves in <100ms, which reads as "the button did nothing". */
const MIN_FEEDBACK_MS = 700;

export default function OfflineScreen({
  onRetry,
  title = "no connection",
  message = `${APP_NAME} needs the internet to send and receive hugs. please check your connection and try again.`,
  caption = "",
}: OfflineScreenProps) {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleRetry = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    const startedAt = Date.now();
    try {
      await onRetry?.();
    } finally {
      const wait = Math.max(0, MIN_FEEDBACK_MS - (Date.now() - startedAt));
      setTimeout(() => {
        if (mounted.current) setChecking(false);
      }, wait);
    }
  }, [checking, onRetry]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.center}>
        <BreathingHalo>
          <OfflineCloud />
        </BreathingHalo>

        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>

        <PlushButton
          label={checking ? "Checking…" : "Try again"}
          onPress={handleRetry}
          variant="primary"
          disabled={checking}
          borderRadius={999}
          height={56}
          style={styles.button}
        />

        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- */

/**
 * Three stacked white circles fading outward. RN has no radial gradient
 * without Skia or SVG, and this reads identically at these opacities —
 * not worth mounting a Skia canvas on a screen that exists to say
 * "nothing is working right now".
 */
function BreathingHalo({ children }: { children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!cancelled) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, scale]);

  const breathe = scale.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });

  return (
    <Animated.View style={[styles.halo, { transform: [{ scale: breathe }] }]}>
      <View style={styles.haloMid}>
        <View style={styles.haloInner}>{children}</View>
      </View>
    </Animated.View>
  );
}

function OfflineCloud() {
  return (
    <View style={styles.cloudBox}>
      <Ionicons name="cloud-outline" size={76} color={colors.lilac} />
      <View style={styles.slashCut} />
      <View style={styles.slash} />
      <View style={styles.dot} />
    </View>
  );
}

/* ---------------------------------------------------------------- */

const SLASH_LENGTH = 78;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mistBg,
    paddingHorizontal: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  halo: {
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: "rgba(255,255,255,0.30)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  haloMid: {
    width: HALO * 0.78,
    height: HALO * 0.78,
    borderRadius: (HALO * 0.78) / 2,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  haloInner: {
    width: HALO * 0.56,
    height: HALO * 0.56,
    borderRadius: (HALO * 0.56) / 2,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  cloudBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  slash: {
    position: "absolute",
    width: 4,
    height: SLASH_LENGTH,
    borderRadius: 2,
    backgroundColor: colors.primary,
    transform: [{ rotate: "45deg" }],
  },
  slashCut: {
    position: "absolute",
    width: 10,
    height: SLASH_LENGTH + 4,
    borderRadius: 5,
    // Matches haloInner so the slash appears to cut a gap in the cloud.
    backgroundColor: "#FDFDFF",
    transform: [{ rotate: "45deg" }],
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.blush,
  },

  title: {
    fontFamily: font.displayBold,
    fontSize: 30,
    color: colors.plumInk,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: font.ui,
    fontSize: 17,
    lineHeight: 25,
    color: colors.softInk,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: spacing.xl + spacing.sm,
  },
  button: {
    minWidth: 200,
  },
  caption: {
    fontFamily: font.hand,
    fontSize: 21,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.xl + spacing.sm,
  },
});
