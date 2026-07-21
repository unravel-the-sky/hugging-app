/**
 * HugFaceSeal — the "sealed" hug visual on the receive side.
 *
 * Reuses the send-screen language (the sender's face + open arms) so
 * opening a hug closes the loop with sending one. Drop this in wherever
 * the envelope currently renders in the reveal overlay's sealed state.
 *
 * Renders the *sender's* avatar:
 *  - drawn (male/female) → the SVG Face
 *  - photo               → resolved on demand from the sender's uid
 *
 * A gentle idle breathing + arm sway makes it feel alive without any
 * gesture — this screen is passive (you just tap "open it").
 */

import { useAvatarThumb } from "@/hooks/useAvatarThumbnail";
import { Face } from "./Face";
import HugArms from "./HugArms";
import { PhotoFace } from "./PhotoFace";
import { AvatarType } from "@/lib/createUser";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  /** sender uid — used to resolve a photo avatar */
  fromUid: string;
  /** sender's avatar type, denormalized on the hug (hug.fromAvatar) */
  fromAvatar?: AvatarType;
  size?: number;
};

export function HugFaceSeal({
  fromUid,
  fromAvatar = "male",
  size = 150,
}: Props) {
  // Face/HugArms are driven by a hugProgress SharedValue on the send
  // screen. Here nothing is charging, so we hold a gentle idle value so
  // the arms sit open and the cheeks/hearts read as "ready to hug".
  const idle = useSharedValue(0.6);

  // slow breathing
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breathe]);

  const bob = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + breathe.value * 0.04 },
      { translateY: breathe.value * -4 },
    ],
  }));

  const photoUri = useAvatarThumb(fromUid);
  const isPhoto = fromAvatar === "photo" && !!photoUri;

  return (
    <Animated.View style={[styles.wrap, bob]}>
      <HugArms hugProgress={idle} />
      {isPhoto ? (
        <PhotoFace uri={photoUri!} hugProgress={idle} />
      ) : (
        <Face hugProgress={idle} userAvatar={fromAvatar} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
