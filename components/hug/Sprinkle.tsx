import { useEffect } from "react";
import { Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type SprinkleProps = {
  onDone: () => void;
};

export default function Sprinkle({ onDone }: SprinkleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue((Math.random() - 0) * 100);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 200 });
    translateY.value = withTiming(-100, { duration: 800 });
    translateX.value = withTiming(
      translateX.value - (Math.random() - 0.5) * 150,
      { duration: 800 },
    );
    opacity.value = withTiming(0, { duration: 900 }, () => {
      scheduleOnRN(onDone);
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Text
        style={{
          fontSize: 18,
          lineHeight: 18,
          includeFontPadding: false,
          textAlignVertical: "center",
        }}
      >
        ❤️
      </Text>
    </Animated.View>
  );
}
