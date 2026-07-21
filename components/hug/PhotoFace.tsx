import { Image as ExpoImage } from "expo-image";
import { StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

/**
 * PhotoFace — circular photo "face" for the send-hug button.
 *
 * Fakes a 3D sphere without Skia:
 *  - a specular highlight (top-left) + rim vignette shade the flat disc
 *    into a ball. These are static SVG gradients over the image.
 *  - a volume-preserving jelly wobble driven by hugProgress: as the hug
 *    charges, one axis squashes while the other stretches, so it feels
 *    like a springy sphere. The overall grow still comes from the parent.
 *
 * Dial the two knobs below to taste. When you want the "real" warp
 * later, this is still the single file to swap.
 */

const SIZE = 110;
const WOBBLE = 0.06; // how much the jelly squishes (0 = off)
const SHINE = 0.55; // highlight strength (0 = matte)

export function PhotoFace({
  uri,
  hugProgress,
}: {
  uri: string;
  hugProgress?: SharedValue<number>;
}) {
  const jelly = useAnimatedStyle(() => {
    const p = hugProgress?.value ?? 0;
    // a couple of springy bounces across the charge, settling by the end
    const s = Math.sin(p * Math.PI * 5) * WOBBLE * (1 - p * 0.4);
    return { transform: [{ scaleX: 1 + s }, { scaleY: 1 - s }] };
  });

  return (
    <Animated.View style={[styles.wrap, jelly]}>
      <ExpoImage
        source={{ uri }}
        style={styles.photo}
        contentFit="cover"
        transition={100}
      />

      {/* spherical shading — sits on top of the photo, ignores touches */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {/* light coming from the top-left */}
          {/* <RadialGradient id="shine" cx="35%" cy="28%" r="70%">
            <Stop offset="0" stopColor="#fff" stopOpacity={SHINE} />
            <Stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          </RadialGradient> */}
          {/* darker toward the rim, to round the edge off */}
          <RadialGradient id="rim" cx="50%" cy="50%" r="50%">
            <Stop offset="0.62" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#2a2140" stopOpacity="0.28" />
          </RadialGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#rim)" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#shine)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  photo: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
});
