import { useEffect, useRef } from "react";
import { DeviceMotion } from "expo-sensors";

export type TiltRef = React.RefObject<{ x: number; y: number }>;

/**
 * Phone-tilt as a JS-thread ref (so R3F's useFrame can read it directly).
 *
 * Returns { x, y } where:
 *   x = pitch delta (tilt the phone forward/back)
 *   y = roll  delta (tilt the phone left/right)
 * Both in radians, relative to however the phone was held when the
 * overlay opened, clamped and smoothed.
 *
 * NOTE: uses expo-sensors (JS thread) on purpose, NOT Reanimated's
 * useAnimatedSensor (UI thread) — useFrame can't reliably read a
 * UI-thread shared value.
 *
 * Raw device motion (gyro/accelerometer) requires NO runtime permission
 * on iOS, so we subscribe directly. Do NOT gate on
 * requestPermissionsAsync(): that checks Motion & Fitness
 * (CMMotionActivityManager), which this feature doesn't use and which
 * returns not-granted on production/TestFlight builds — the listener
 * then never attaches and the ref stays at 0.
 */
export function useTilt(
  enabled = true,
  smoothing = 0.12,
  clamp = 0.6,
): TiltRef {
  const tilt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    let baseline: { x: number; y: number } | null = null;
    const clampAbs = (v: number) => Math.max(-clamp, Math.min(clamp, v));

    DeviceMotion.setUpdateInterval(16); // ~60 Hz
    const sub = DeviceMotion.addListener((data) => {
      const r = data.rotation;
      if (!r) return;

      // First reading becomes the rest pose.
      if (!baseline) baseline = { x: r.beta, y: r.gamma };

      const targetX = clampAbs(r.beta - baseline.x);
      const targetY = clampAbs(r.gamma - baseline.y);

      // Exponential smoothing toward the new reading.
      tilt.current.x += (targetX - tilt.current.x) * smoothing;
      tilt.current.y += (targetY - tilt.current.y) * smoothing;
    });

    return () => sub.remove();
  }, [enabled, smoothing, clamp]);

  return tilt;
}
