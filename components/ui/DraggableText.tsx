import { Pressable, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

export default function DraggableText({
  item = "",
  onPressed,
}: {
  item: string;
  onPressed: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const drag = Gesture.Pan().onChange((event) => {
    translateX.value += event.changeX;
    translateY.value += event.changeY;
  });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: translateX.value,
        },
        {
          translateY: translateY.value,
        },
        {
          rotateZ: `${(rotation.value / Math.PI) * 180}deg`,
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        style={[
          containerStyle,
          {
            alignItems: "center",
            bottom: 70,
          },
        ]}
      >
        <Pressable onPress={onPressed}>
          <Text style={{ fontSize: 30, fontFamily: "CuteFont" }}>{item}</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
