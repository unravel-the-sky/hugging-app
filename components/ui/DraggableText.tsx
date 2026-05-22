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

  const scale = useSharedValue(1);
  const offsetScale = useSharedValue(1);

  const drag = Gesture.Pan().onChange((event) => {
    translateX.value += event.changeX;
    translateY.value += event.changeY;
  });

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = offsetScale.value * event.scale;
    })
    .onEnd(() => {
      offsetScale.value = scale.value;
    });

  const rotate = Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const mergedGesture = Gesture.Simultaneous(drag, pinch, rotate);

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
        {
          scale: scale.value,
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={mergedGesture}>
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
