import { act, useEffect } from "react";
import { StyleSheet } from "react-native";
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const source = Skia.RuntimeEffect.Make(`
    uniform float u_time;
  uniform vec2  u_resolution;
  uniform float u_intensity;

  float sdCircle(vec2 p, float r) { return length(p) - r; }

  float beat(float t) {
    float c = fract(t);
    float d1 = (c - 0.10) / 0.05;
    float d2 = (c - 0.26) / 0.05;
    return exp(-d1*d1) + 0.6 * exp(-d2*d2);
  }

  vec4 main(vec2 fragCoord) {
    vec2 res = u_resolution;
    vec2 p = (2.0 * fragCoord - res) / min(res.x, res.y);
    float pulse = beat(u_time * 1.1);
    float scale = 1.0 + 0.15 * pulse * u_intensity;
    p /= max(scale, 0.001);
    float f = sdCircle(p, 0.6);
    float px = 4.0 / res.y;
    float fill = smoothstep(px, -px, f);
    float glow = exp(-max(f, 0.0) * 3.5) * 0.55;
    glow *= 0. + 0.6 * pulse;

    float alpha = clamp(fill + glow, 0.0, 1.0) * u_intensity;
    vec3 base = vec3(1.0, 0.25, 0.35);
    vec3 hot  = vec3(1.0, 0.55, 0.55);
    vec3 col  = mix(base, hot, clamp(pulse, 0.0, 1.0) * 0.6);
    return vec4(col * alpha, alpha);
  }
`);

export default function HeartbeatOverlay({
  active,
  width,
  height,
}: {
  active: boolean;
  width: number;
  height: number;
}) {
  const clock = useClock();
  const intensity = useSharedValue(0);

  useEffect(() => {
    intensity.value = withTiming(active ? 1 : 0, { duration: 200 });
  }, [active]);

  const uniforms = useDerivedValue(() => ({
    u_time: clock.value / 1000,
    u_resolution: [width, height],
    u_intensity: intensity.value,
  }));

  if (!source) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
